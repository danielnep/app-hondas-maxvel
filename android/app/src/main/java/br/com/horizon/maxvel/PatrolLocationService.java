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
import android.os.Build;
import android.os.BatteryManager;
import android.os.IBinder;
import android.os.Looper;

/** Coleta de localização enquanto uma ronda REAL estiver ativa, com notificação persistente.
 * Pode continuar quando a interface é fechada / tela bloqueada, sob limites do Android.
 * Parada forçada / ação "Parar" no sistema NÃO podem ser contornadas.
 */
public class PatrolLocationService extends Service implements LocationListener {
    public static final String START="br.com.horizon.maxvel.START_TRACKING";
    public static final String STOP="br.com.horizon.maxvel.STOP_TRACKING";
    private static final String CHANNEL="ronda_em_andamento";
    private static final int NOTIFICATION_ID=144;
    private LocationManager locationManager;
    private TraceStore database;

    @Override public void onCreate(){super.onCreate();database=new TraceStore(this);locationManager=(LocationManager)getSystemService(LOCATION_SERVICE);}

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&STOP.equals(intent.getAction())){stopTracking();return START_NOT_STICKY;}
        boolean active=getSharedPreferences("tracking",MODE_PRIVATE).getBoolean("active",false);
        if(intent==null&&!active){stopSelf();return START_NOT_STICKY;}
        if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED&&
           checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED){stopTracking();return START_NOT_STICKY;}
        getSharedPreferences("tracking",MODE_PRIVATE).edit().putBoolean("active",true).apply();
        startPersistentNotification();
        try {
            if(locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER))
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER,2000L,2f,this,Looper.getMainLooper());
            if(locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,4000L,3f,this,Looper.getMainLooper());
        }catch(SecurityException|IllegalArgumentException ignored){}
        return START_STICKY;
    }

    private void startPersistentNotification(){
        NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Ronda em andamento",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Intent stopIntent=new Intent(this,PatrolLocationService.class);stopIntent.setAction(STOP);
        PendingIntent stop=PendingIntent.getService(this,1,stopIntent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification n=new Notification.Builder(this,CHANNEL)
          .setSmallIcon(br.com.horizon.maxvel.R.drawable.ic_maxvel)
          .setContentTitle("Rondas Pro · ronda ativa")
          .setContentText("Localização em uso durante a ronda. Toque para abrir.")
          .setContentIntent(open)
          .setOngoing(true)
          .addAction(new Notification.Action.Builder(null,"Parar acompanhamento",stop).build())
          .build();
        if(Build.VERSION.SDK_INT>=29)startForeground(NOTIFICATION_ID,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        else startForeground(NOTIFICATION_ID,n);
    }

    @Override public void onLocationChanged(Location loc){
        if(getSharedPreferences("tracking",MODE_PRIVATE).getBoolean("active",false)){BatteryManager battery=(BatteryManager)getSystemService(BATTERY_SERVICE);int level=battery==null?-1:battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);database.record(loc,level);} 
    }
    @Override public void onProviderDisabled(String provider) { }
    @Override public void onProviderEnabled(String provider) { }
    private void stopTracking(){getSharedPreferences("tracking",MODE_PRIVATE).edit().putBoolean("active",false).apply();if(locationManager!=null)locationManager.removeUpdates(this);stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();}
    @Override public void onDestroy(){if(locationManager!=null)locationManager.removeUpdates(this);database.close();super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}