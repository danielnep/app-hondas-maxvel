package br.com.horizon.maxvel;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Serviço Android nativo: foreground enquanto a rota estiver ativa, GPS e envio offline-first ao COI. */
public class PatrolLocationService extends Service implements LocationListener {
    public static final String START="br.com.horizon.maxvel.START_TRACKING";
    public static final String STOP="br.com.horizon.maxvel.STOP_TRACKING";
    public static final String START_SHIFT="br.com.horizon.maxvel.START_SHIFT";
    public static final String STOP_ROUTE="br.com.horizon.maxvel.STOP_ROUTE";
    private static final String CHANNEL="maxvel_ronda_ativa";
    private static final int NOTIFICATION_ID=144;
    private final ExecutorService network=Executors.newSingleThreadExecutor();
    private final Handler handler=new Handler(Looper.getMainLooper());
    private LocationManager locationManager;
    private TraceStore database;
    private String roundId="";
    private long queuedAt=0;
    private long lastPresenceAt=0;
    private Location lastFix;
    private boolean running=false;
    private final Runnable repeatUpload=new Runnable(){
        @Override public void run(){if(running){network.execute(()->{uploadPending();sendPresence();});handler.postDelayed(this,15000);}}
    };

    @Override public void onCreate(){
        super.onCreate();
        database=new TraceStore(this);
        locationManager=(LocationManager)getSystemService(LOCATION_SERVICE);
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&STOP.equals(intent.getAction())){stopTracking();return START_NOT_STICKY;}
        boolean active=getSharedPreferences("tracking",MODE_PRIVATE).getBoolean("active",false);
        String stored=getSharedPreferences("tracking",MODE_PRIVATE).getString("roundId","");
        String requested=intent==null?stored:intent.getStringExtra("roundId");
        if(intent!=null&&STOP_ROUTE.equals(intent.getAction()))requested="";
        if(requested==null)requested=stored;
        if((intent==null&&!active)||NativeApi.token(this).isEmpty()){
            stopTracking();return START_NOT_STICKY;
        }
        if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){
            stopTracking();return START_NOT_STICKY;
        }
        roundId=requested.length()>=8?requested:"";
        getSharedPreferences("tracking",MODE_PRIVATE).edit().putBoolean("active",true).putString("roundId",roundId).apply();
        startNotification();
        if(running){return START_STICKY;}
        running=true;
        try{
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER,2000L,2f,this,Looper.getMainLooper());
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,4000L,3f,this,Looper.getMainLooper());
        }catch(SecurityException|IllegalArgumentException ignored){}
        handler.removeCallbacks(repeatUpload);handler.post(repeatUpload);
        return START_STICKY;
    }
    private void startNotification(){
        NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Localização da equipe em expediente",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notice=new Notification.Builder(this,CHANNEL)
            .setSmallIcon(R.drawable.ic_maxvel)
            .setContentTitle("MAXVEL · Expediente em andamento")
            .setContentText("Localização e conexão monitoradas até sair da conta.")
            .setContentIntent(open).setOngoing(true)
            .build();
        startForeground(NOTIFICATION_ID,notice,ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
    }
    @Override public void onLocationChanged(Location loc){
        if(!running||loc==null||!loc.hasAccuracy())return;
        lastFix=loc;
        BatteryManager bm=(BatteryManager)getSystemService(BATTERY_SERVICE);
        int battery=bm==null?-1:bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
        database.record(loc,battery);
        if(roundId.length()>=8&&loc.getAccuracy()<=90&&(queuedAt==0||loc.getTime()-queuedAt>=10000)){
            queuedAt=loc.getTime();
            database.enqueue(loc,Math.max(0,battery),roundId);
        }
    }
    private void sendPresence(){
        long current=System.currentTimeMillis();
        if(current-lastPresenceAt<40000||NativeApi.token(this).isEmpty())return;
        try{
            JSONObject payload=new JSONObject();JSONObject position=new JSONObject();
            Location fix=lastFix;
            if(fix!=null&&fix.hasAccuracy()){
                position.put("lat",fix.getLatitude());position.put("lng",fix.getLongitude());position.put("accuracy",fix.getAccuracy());
                payload.put("position",position);
            }
            NativeApi.call(this,"/api/presence","POST",payload);
            lastPresenceAt=current;
        }catch(Exception ignored){ /* ausência de rede não encerra expediente; COI detecta ausência de heartbeat */ }
    }
    private void uploadPending(){
        if(NativeApi.token(this).isEmpty())return;
        try{
            JSONArray pending=database.pending(30);
            for(int i=0;i<pending.length();i++){
                JSONObject item=pending.getJSONObject(i);
                try{
                    NativeApi.call(this,"/api/events","POST",item);
                    database.markSent(item.getString("id"));
                }catch(NativeApi.ApiException error){
                    if(error.status==401||error.status>=500||error.status==429)break;
                    // 4xx não recuperáveis não são ocultados: mantêm registro local para análise.
                    break;
                }catch(Exception error){break;}
            }
        }catch(Exception ignored){ /* lote permanece em SQLite para retentativa */ }
    }
    private void stopTracking(){
        running=false;
        getSharedPreferences("tracking",MODE_PRIVATE).edit().putBoolean("active",false).remove("roundId").apply();
        handler.removeCallbacks(repeatUpload);
        if(locationManager!=null)locationManager.removeUpdates(this);
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }
    @Override public void onDestroy(){
        running=false;handler.removeCallbacks(repeatUpload);
        if(locationManager!=null)locationManager.removeUpdates(this);
        network.shutdown();database.close();super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}
