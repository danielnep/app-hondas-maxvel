package br.com.horizon.maxvel;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.maplibre.android.MapLibre;
import org.maplibre.android.camera.CameraPosition;
import org.maplibre.android.camera.CameraUpdateFactory;
import org.maplibre.android.geometry.LatLng;
import org.maplibre.android.maps.MapView;
import org.maplibre.android.maps.MapLibreMap;
import org.maplibre.android.maps.Style;
import org.maplibre.android.style.layers.CircleLayer;
import org.maplibre.android.style.layers.LineLayer;
import org.maplibre.android.style.layers.SymbolLayer;
import org.maplibre.android.style.layers.PropertyFactory;
import org.maplibre.android.style.sources.GeoJsonSource;

/** Interface 100% Android Views + mapa nativo. Nada de WebView, HTML ou simulação. */
public class MainActivity extends Activity implements LocationListener,SensorEventListener {
    private static final int LOCATION_PERMISSION=31;
    private static final int DARK=0xff17191d,RED=0xffdf343c,WHITE=0xfff2f4f6;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private final Handler handler=new Handler(Looper.getMainLooper());
    private LocationManager locationManager;
    private SensorManager sensors;
    private Sensor rotationSensor;
    private Location fix;
    private float compass=0;
    private MapView mapView;
    private MapLibreMap map;
    private TextView title,status,steps,checkpoint;
    private Button startButton,checkButton;
    private boolean following=true,started=false;
    private JSONObject selected;
    private final ArrayList<Destination> points=new ArrayList<>();
    private int next=0;
    private long insideSince=0,lastNavRequest=0,lastFollow=0;
    private JSONArray roadGeometry;
    private String nextInstruction="";
    private final Runnable refresh=new Runnable(){@Override public void run(){if(!isFinishing()&&NativeApi.token(MainActivity.this).length()>0)loadDispatches(false);handler.postDelayed(this,25000);}};

    private static class Destination{
        final double lat,lng;
        final String name;
        Destination(double la,double lo,String text){lat=la;lng=lo;name=text;}
    }
    private interface Result{void done(JSONObject response)throws Exception;}
    @Override public void onCreate(Bundle bundle){
        super.onCreate(bundle);
        getWindow().setStatusBarColor(DARK);getWindow().setNavigationBarColor(DARK);
        locationManager=(LocationManager)getSystemService(LOCATION_SERVICE);
        sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
        rotationSensor=sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        MapLibre.getInstance(this);
        if(NativeApi.token(this).isEmpty())showLogin();
        else request("/api/me","GET",null,json->{
            String role=json.getJSONObject("user").optString("role");
            if(!role.equals("ronda"))throw new IllegalStateException("Entre com uma conta de Agente de Ronda.");
            showMap(bundle);loadDispatches(true);
        });
    }
    private TextView text(String value,int size,int color){
        TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setPadding(dp(14),dp(12),dp(14),dp(12));return t;
    }
    private int dp(int value){return Math.round(getResources().getDisplayMetrics().density*value);}
    private Button button(String label){
        Button b=new Button(this);b.setText(label);b.setTextColor(WHITE);b.setAllCaps(false);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(RED));
        return b;
    }
    private void showLogin(){
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);l.setBackgroundColor(DARK);l.setPadding(dp(24),dp(48),dp(24),dp(16));
        l.addView(text("RONDAS PRO  ·  MAXVEL",24,WHITE));
        l.addView(text("Acesso operacional do Agente de Ronda",15,0xffa8b1bc));
        EditText username=new EditText(this);username.setSingleLine();username.setTextColor(WHITE);username.setHintTextColor(0xffaab0bc);username.setHint("Usuário");username.setInputType(1);
        EditText pass=new EditText(this);pass.setSingleLine();pass.setTextColor(WHITE);pass.setHintTextColor(0xffaab0bc);pass.setHint("Senha");pass.setInputType(129);
        l.addView(username);l.addView(pass);
        Button enter=button("Entrar");l.addView(enter);
        enter.setOnClickListener(v->{
            if(username.getText().length()==0||pass.getText().length()==0){notice("Informe usuário e senha.");return;}
            try{
                JSONObject payload=new JSONObject().put("email",username.getText().toString().trim()).put("password",pass.getText().toString());
                io.execute(()->{
                    try{
                        JSONObject data=NativeApi.call(this,"/api/login","POST",payload);
                        String role=data.getJSONObject("user").optString("role");
                        if(!role.equals("ronda")){runOnUiThread(()->notice("Use uma conta de Agente de Ronda."));return;}
                        NativeApi.saveLogin(this,data.getString("token"),username.getText().toString().trim());
                        runOnUiThread(()->{showMap(null);loadDispatches(true);});
                    }catch(Exception error){runOnUiThread(()->notice(error.getMessage()));}
                });
            }catch(Exception e){notice(e.getMessage());}
        });
        setContentView(l);
    }
    private void showMap(Bundle state){
        FrameLayout frame=new FrameLayout(this);frame.setBackgroundColor(DARK);
        mapView=new MapView(this);frame.addView(mapView,new FrameLayout.LayoutParams(-1,-1));
        mapView.onCreate(state);
        mapView.getMapAsync(m->{
            map=m;
            map.setStyle(new Style.Builder().fromUri("https://tiles.openfreemap.org/styles/liberty"),style->{
                style.addImage("ronda-arrow",makeArrow());
                style.addSource(new GeoJsonSource("ronda-position",geoPoint(0,0)));
                style.addLayer(new SymbolLayer("ronda-person","ronda-position").withProperties(
                    PropertyFactory.iconImage("ronda-arrow"),PropertyFactory.iconAllowOverlap(true),
                    PropertyFactory.iconIgnorePlacement(true),PropertyFactory.iconRotate(0f)));
                style.addSource(new GeoJsonSource("ronda-next",geoPoint(0,0)));
                style.addLayer(new CircleLayer("ronda-target","ronda-next").withProperties(
                    PropertyFactory.circleColor(RED),PropertyFactory.circleRadius(10f),
                    PropertyFactory.circleStrokeWidth(3f),PropertyFactory.circleStrokeColor(WHITE)));
                style.addSource(new GeoJsonSource("ronda-road",emptyLine()));
                style.addLayer(new LineLayer("ronda-street","ronda-road").withProperties(
                    PropertyFactory.lineColor(0xff168eff),PropertyFactory.lineWidth(7f),
                    PropertyFactory.lineOpacity(.92f)));
                if(fix!=null)updateLocationView();
                else map.moveCamera(CameraUpdateFactory.newCameraPosition(
                    new CameraPosition.Builder().target(new LatLng(-20.140, -44.885)).zoom(13).build()));
                updateDestination();
            });
        });
        LinearLayout top=new LinearLayout(this);top.setOrientation(LinearLayout.VERTICAL);top.setBackgroundColor(0xea16191e);
        title=text("MAXVEL  ·  AGENTE DE RONDA",16,WHITE);
        status=text("Buscando rondas atribuídas…",13,0xffdbe3eb);
        top.addView(title);top.addView(status);
        FrameLayout.LayoutParams pTop=new FrameLayout.LayoutParams(-1,-2,Gravity.TOP);frame.addView(top,pTop);
        LinearLayout bottom=new LinearLayout(this);bottom.setOrientation(LinearLayout.VERTICAL);bottom.setPadding(dp(9),dp(8),dp(9),dp(15));bottom.setBackgroundColor(0xf3191c20);
        steps=text("Selecione uma ronda atribuída no COI.",15,WHITE);
        checkpoint=text("GPS aguardando localização.",13,0xffbfcad3);
        bottom.addView(steps);bottom.addView(checkpoint);
        LinearLayout actions=new LinearLayout(this);
        Button select=button("Rondas"),recenter=button("Centralizar"),incident=button("Ocorrência");
        actions.addView(select,new LinearLayout.LayoutParams(0,dp(48),1));
        actions.addView(recenter,new LinearLayout.LayoutParams(0,dp(48),1));
        actions.addView(incident,new LinearLayout.LayoutParams(0,dp(48),1));
        bottom.addView(actions);
        LinearLayout active=new LinearLayout(this);
        startButton=button("Iniciar rota");checkButton=button("Estou aqui");
        active.addView(startButton,new LinearLayout.LayoutParams(0,dp(53),1));
        active.addView(checkButton,new LinearLayout.LayoutParams(0,dp(53),1));
        bottom.addView(active);
        FrameLayout.LayoutParams pBottom=new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM);frame.addView(bottom,pBottom);
        select.setOnClickListener(v->loadDispatches(true));
        recenter.setOnClickListener(v->{following=true;updateLocationView();});
        incident.setOnClickListener(v->incidentDialog());
        startButton.setOnClickListener(v->{if(started)finishPatrol();else startPatrol();});
        checkButton.setOnClickListener(v->checkin());
        setContentView(frame);
        requestLocation();
        handler.removeCallbacks(refresh);handler.postDelayed(refresh,25000);
    }
    private Bitmap makeArrow(){
        Bitmap bitmap=Bitmap.createBitmap(112,112,Bitmap.Config.ARGB_8888);
        Canvas c=new Canvas(bitmap);Paint p=new Paint(3);
        p.setColor(0xff132d45);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(9f);
        Path path=new Path();path.moveTo(56,7);path.lineTo(100,101);path.lineTo(56,83);path.lineTo(12,101);path.close();c.drawPath(path,p);
        p.setColor(0xff208fff);p.setStyle(Paint.Style.FILL);c.drawPath(path,p);
        return bitmap;
    }
    private String geoPoint(double lat,double lng){
        return "{\"type\":\"Feature\",\"properties\":{},\"geometry\":{\"type\":\"Point\",\"coordinates\":["+lng+","+lat+"]}}";
    }
    private String emptyLine(){return "{\"type\":\"Feature\",\"properties\":{},\"geometry\":{\"type\":\"LineString\",\"coordinates\":[]}}";}
    private void updateSource(String source,String json){
        if(map==null||map.getStyle()==null)return;
        GeoJsonSource s=map.getStyle().getSourceAs(source);if(s!=null)s.setGeoJson(json);
    }
    private void request(String path,String method,JSONObject data,Result success){
        io.execute(()->{try{JSONObject json=NativeApi.call(this,path,method,data);runOnUiThread(()->{
            try{success.done(json);}catch(Exception e){notice(e.getMessage());}
        });}catch(Exception error){runOnUiThread(()->{
            if(error instanceof NativeApi.ApiException&&((NativeApi.ApiException)error).status==401){
                NativeApi.logout(this);showLogin();
            }else notice(error.getMessage());
        });}});
    }
    private void loadDispatches(boolean showPicker){
        request("/api/dispatches","GET",null,response->{
            JSONArray array=response.optJSONArray("dispatches");
            if(array==null)return;
            ArrayList<JSONObject> rows=new ArrayList<>();
            for(int i=0;i<array.length();i++){
                JSONObject item=array.optJSONObject(i);
                if(item!=null&&"ronda".equals(item.optString("kind"))&&item.isNull("completed_at"))rows.add(item);
            }
            if(rows.isEmpty()){if(selected==null)status.setText("Nenhuma ronda pendente atribuída.");return;}
            if(showPicker||selected==null){
                String[] names=new String[rows.size()];
                for(int i=0;i<rows.size();i++)names[i]=(i+1)+". "+rows.get(i).optString("address","Ronda")+
                    (rows.get(i).isNull("started_at")?" · Pendente":" · Em andamento");
                new AlertDialog.Builder(this).setTitle("Rondas recebidas do COI").setItems(names,(dialog,which)->choose(rows.get(which))).setNegativeButton("Fechar",null).show();
            }else{
                for(JSONObject row:rows)if(row.optString("id").equals(selected.optString("id"))){selected=row;break;}
            }
        });
    }
    private void choose(JSONObject item){
        if(started&&!item.optString("id").equals(selected==null?"":selected.optString("id"))){
            notice("Conclua a ronda em andamento primeiro.");return;
        }
        selected=item;points.clear();next=0;insideSince=0;roadGeometry=null;
        try{
            Object raw=item.opt("route_points");
            JSONArray route=raw instanceof JSONArray?(JSONArray)raw:new JSONArray(item.optString("route_points","[]"));
            for(int i=0;i<route.length();i++){
                JSONObject pt=route.optJSONObject(i);
                if(pt!=null&&pt.has("lat")&&pt.has("lng"))
                    points.add(new Destination(pt.getDouble("lat"),pt.getDouble("lng"),pt.optString("label","Ponto "+(i+1))));
            }
            if(points.isEmpty()&&!item.isNull("latitude")&&!item.isNull("longitude"))
                points.add(new Destination(item.getDouble("latitude"),item.getDouble("longitude"),item.optString("address","Destino")));
            if(points.isEmpty()){notice("O COI não cadastrou coordenadas para esta rota.");startButton.setEnabled(false);return;}
            startButton.setEnabled(true);
            started=!item.isNull("started_at")&&item.optLong("started_at")>0;
            startButton.setText(started?"Concluir ronda":"Iniciar rota");
            if(started)startNativeTracking();
            status.setText(points.size()+" destino(s)  ·  "+item.optString("address"));
            updateDestination();
            if(fix!=null)routeToNext();
        }catch(Exception e){notice("Rota inválida: "+e.getMessage());}
    }
    private void startPatrol(){
        if(selected==null||points.isEmpty()){notice("Selecione uma rota real do COI.");return;}
        if(!hasLocation()){requestLocation();return;}
        if(fix==null||System.currentTimeMillis()-fix.getTime()>30000){notice("Aguardando sinal GPS atual.");return;}
        request("/api/dispatches/"+selected.optString("id")+"/start","POST",new JSONObject(),data->{
            started=true;startButton.setText("Concluir ronda");startNativeTracking();routeToNext();
            notice("Ronda iniciada. Rastreamento ativo na notificação.");
        });
    }
    private void startNativeTracking(){
        if(!hasLocation())return;
        Intent i=new Intent(this,PatrolLocationService.class);
        i.setAction(PatrolLocationService.START);i.putExtra("roundId",selected.optString("id"));
        try{startForegroundService(i);}catch(Exception e){notice("Não foi possível ativar o GPS persistente.");}
    }
    private void finishPatrol(){
        if(!started||selected==null)return;
        if(next<points.size()){notice("Confirme todos os pontos antes de concluir.");return;}
        try{
            JSONObject payload=new JSONObject().put("note","Ronda concluída nos pontos previstos.");
            request("/api/dispatches/"+selected.optString("id")+"/complete","POST",payload,data->{
                stopService(new Intent(this,PatrolLocationService.class));
                started=false;selected=null;points.clear();next=0;insideSince=0;roadGeometry=null;
                startButton.setText("Iniciar rota");status.setText("Ronda concluída.");
                updateSource("ronda-road",emptyLine());updateDestination();loadDispatches(true);
            });
        }catch(Exception e){notice(e.getMessage());}
    }
    private void checkin(){
        if(!started||next>=points.size()||fix==null){notice("Inicie a ronda e aguarde o GPS.");return;}
        if(fix.getAccuracy()>35||System.currentTimeMillis()-fix.getTime()>12000){
            notice("GPS sem precisão suficiente para confirmar presença.");return;
        }
        Destination p=points.get(next);float[] distance=new float[1];
        Location.distanceBetween(fix.getLatitude(),fix.getLongitude(),p.lat,p.lng,distance);
        if(distance[0]>35){notice("Aproxime-se do destino. Distância: "+Math.round(distance[0])+" m.");return;}
        long dwell=insideSince==0?0:SystemClock.elapsedRealtime()-insideSince;
        if(dwell<30000){notice("Permaneça no ponto por mais "+Math.max(1,(30000-dwell+999)/1000)+" s.");return;}
        try{
            JSONObject payload=new JSONObject().put("id",java.util.UUID.randomUUID().toString())
                .put("kind","checkpoint").put("roundId",selected.optString("id"))
                .put("occurredAt",System.currentTimeMillis())
                .put("description","Ponto "+(next+1)+" de "+points.size()+": "+p.name)
                .put("details",new JSONObject().put("pointIndex",next).put("dispatchId",selected.optString("id")))
                .put("position",new JSONObject().put("lat",fix.getLatitude()).put("lng",fix.getLongitude()).put("accuracy",fix.getAccuracy()));
            checkButton.setEnabled(false);
            request("/api/events","POST",payload,data->{
                next++;insideSince=0;checkButton.setEnabled(true);
                updateDestination();
                if(next<points.size())routeToNext();
                else{updateSource("ronda-road",emptyLine());steps.setText("Todos os pontos confirmados. Conclua a ronda.");}
            });
        }catch(Exception e){checkButton.setEnabled(true);notice(e.getMessage());}
    }
    private void incidentDialog(){
        if(!started){notice("Inicie uma ronda para registrar ocorrências.");return;}
        EditText input=new EditText(this);input.setHint("Descreva a ocorrência");input.setMinLines(3);
        new AlertDialog.Builder(this).setTitle("Nova ocorrência").setView(input).setPositiveButton("Enviar ao COI",(d,w)->{
            String message=input.getText().toString().trim();if(message.length()<10){notice("Descreva a ocorrência com mais detalhes.");return;}
            try{JSONObject obj=new JSONObject().put("id",java.util.UUID.randomUUID().toString()).put("kind","incident")
                .put("roundId",selected.optString("id")).put("occurredAt",System.currentTimeMillis()).put("description",message);
                if(fix!=null)obj.put("position",new JSONObject().put("lat",fix.getLatitude()).put("lng",fix.getLongitude()).put("accuracy",fix.getAccuracy()));
                request("/api/events","POST",obj,data->notice("Ocorrência enviada ao COI."));
            }catch(Exception e){notice(e.getMessage());}
        }).setNegativeButton("Cancelar",null).show();
    }
    private void updateDestination(){
        if(steps==null)return;
        if(next>=points.size()){steps.setText(started?"Todos os pontos confirmados.":"Selecione uma ronda.");updateSource("ronda-next",geoPoint(0,0));return;}
        Destination p=points.get(next);
        updateSource("ronda-next",geoPoint(p.lat,p.lng));
        steps.setText((next+1)+"/"+points.size()+"  ·  "+p.name+(nextInstruction.isEmpty()?"":"\n"+nextInstruction));
    }
    private void routeToNext(){
        if(fix==null||next>=points.size())return;
        Destination p=points.get(next);
        lastNavRequest=SystemClock.elapsedRealtime();
        double lat=fix.getLatitude(),lng=fix.getLongitude();
        io.execute(()->{
            try{
                String url="https://routing.openstreetmap.de/routed-car/route/v1/driving/"+
                    lng+","+lat+";"+p.lng+","+p.lat+"?overview=full&geometries=geojson&steps=true";
                java.net.HttpURLConnection conn=(java.net.HttpURLConnection)new java.net.URL(url).openConnection();
                conn.setConnectTimeout(9000);conn.setReadTimeout(16000);
                conn.setRequestProperty("User-Agent","RondaPro-Maxvel-Android/2");
                if(conn.getResponseCode()!=200)throw new IllegalStateException("Roteador indisponível");
                String response;
                try(java.io.InputStream in=conn.getInputStream()){
                    java.io.ByteArrayOutputStream buf=new java.io.ByteArrayOutputStream();
                    byte[] bytes=new byte[8192];int n;while((n=in.read(bytes))!=-1)buf.write(bytes,0,n);
                    response=buf.toString("UTF-8");
                }
                JSONObject route=new JSONObject(response).getJSONArray("routes").getJSONObject(0);
                JSONArray geometry=route.getJSONObject("geometry").getJSONArray("coordinates");
                double meters=route.optDouble("distance"),mins=route.optDouble("duration")/60.0;
                String instruction=Math.round(meters)+" m pela via · "+Math.max(1,Math.round(mins))+" min (estimado)";
                JSONArray legs=route.optJSONArray("legs");
                if(legs!=null&&legs.length()>0){
                    JSONArray navSteps=legs.getJSONObject(0).optJSONArray("steps");
                    if(navSteps!=null&&navSteps.length()>0){
                        JSONObject first=navSteps.getJSONObject(0);
                        String road=first.optString("name");
                        if(!road.isEmpty())instruction="Siga por "+road+" · "+Math.round(meters)+" m";
                    }
                }
                runOnUiThread(()->{
                    if(next>=points.size()||p!=points.get(next))return;
                    roadGeometry=geometry;nextInstruction=instruction;
                    String geo="{\"type\":\"Feature\",\"properties\":{},\"geometry\":{\"type\":\"LineString\",\"coordinates\":"+geometry+"}}";
                    updateSource("ronda-road",geo);updateDestination();
                });
            }catch(Exception e){runOnUiThread(()->{
                updateSource("ronda-road",emptyLine());
                nextInstruction="Trajeto pelas ruas indisponível. Verifique a conexão.";
                updateDestination();
            });}
        });
    }
    private boolean hasLocation(){
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;
    }
    private void requestLocation(){
        if(!hasLocation()){
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION_PERMISSION);
            return;
        }
        try{
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER,1500,1,this,Looper.getMainLooper());
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,3500,3,this,Looper.getMainLooper());
        }catch(Exception e){notice("Ative a localização do aparelho.");}
    }
    @Override public void onRequestPermissionsResult(int code,String[] p,int[] result){
        super.onRequestPermissionsResult(code,p,result);
        if(code==LOCATION_PERMISSION&&hasLocation())requestLocation();
        else if(code==LOCATION_PERMISSION)notice("A localização precisa é necessária durante a ronda.");
    }
    @Override public void onLocationChanged(Location loc){
        if(!loc.hasAccuracy()||loc.getAccuracy()>90)return;
        if(fix!=null&&loc.getTime()+1500<fix.getTime())return;
        fix=loc;
        if(next<points.size()&&started){
            Destination dest=points.get(next);float[] m=new float[1];
            Location.distanceBetween(loc.getLatitude(),loc.getLongitude(),dest.lat,dest.lng,m);
            if(loc.getAccuracy()<=35&&System.currentTimeMillis()-loc.getTime()<=12000&&m[0]<=35){
                if(insideSince==0)insideSince=SystemClock.elapsedRealtime();
            }else insideSince=0;
            checkpoint.setText("Distância: "+Math.round(m[0])+" m · GPS ±"+Math.round(loc.getAccuracy())+
                " m · Permanência "+(insideSince==0?0:Math.min(30,(SystemClock.elapsedRealtime()-insideSince)/1000))+"/30 s");
            if(roadGeometry!=null&&m[0]>90&&SystemClock.elapsedRealtime()-lastNavRequest>90000)routeToNext();
        }else if(checkpoint!=null)checkpoint.setText("GPS ±"+Math.round(loc.getAccuracy())+" m · Aguardando destino");
        updateLocationView();
    }
    private void updateLocationView(){
        if(map==null||fix==null||map.getStyle()==null)return;
        updateSource("ronda-position",geoPoint(fix.getLatitude(),fix.getLongitude()));
        float head=heading();
        SymbolLayer layer=map.getStyle().getLayerAs("ronda-person");
        if(layer!=null)layer.setProperties(PropertyFactory.iconRotate(head));
        if(following&&SystemClock.elapsedRealtime()-lastFollow>1300){
            lastFollow=SystemClock.elapsedRealtime();
            map.animateCamera(CameraUpdateFactory.newCameraPosition(new CameraPosition.Builder()
                .target(new LatLng(fix.getLatitude(),fix.getLongitude()))
                .zoom(started?17.7:16).tilt(started?50:15).bearing(started?head:0).build()),900);
        }
    }
    private float heading(){
        if(fix!=null&&fix.hasBearing()&&fix.hasSpeed()&&fix.getSpeed()>2.4f)return fix.getBearing();
        return compass;
    }
    @Override public void onSensorChanged(SensorEvent event){
        if(event.sensor.getType()!=Sensor.TYPE_ROTATION_VECTOR)return;
        float[] matrix=new float[9],orientation=new float[3];
        SensorManager.getRotationMatrixFromVector(matrix,event.values);
        SensorManager.getOrientation(matrix,orientation);
        float magnetic=(float)Math.toDegrees(orientation[0]);
        if(fix!=null){
            GeomagneticField field=new GeomagneticField((float)fix.getLatitude(),(float)fix.getLongitude(),
                (float)fix.getAltitude(),fix.getTime());
            magnetic+=field.getDeclination();
        }
        compass=(magnetic+360f)%360f;
    }
    @Override public void onAccuracyChanged(Sensor sensor,int accuracy){}
    private void notice(String message){if(message!=null)Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    @Override protected void onStart(){super.onStart();if(mapView!=null)mapView.onStart();}
    @Override protected void onResume(){super.onResume();if(mapView!=null)mapView.onResume();
        if(rotationSensor!=null)sensors.registerListener(this,rotationSensor,SensorManager.SENSOR_DELAY_GAME);
        if(mapView!=null&&hasLocation())requestLocation();}
    @Override protected void onPause(){if(mapView!=null)mapView.onPause();sensors.unregisterListener(this);super.onPause();}
    @Override protected void onStop(){if(mapView!=null)mapView.onStop();super.onStop();}
    @Override protected void onDestroy(){
        handler.removeCallbacks(refresh);if(locationManager!=null)locationManager.removeUpdates(this);
        if(mapView!=null)mapView.onDestroy();io.shutdownNow();super.onDestroy();
    }
    @Override public void onLowMemory(){super.onLowMemory();if(mapView!=null)mapView.onLowMemory();}
    @Override protected void onSaveInstanceState(Bundle out){
        super.onSaveInstanceState(out);if(mapView!=null)mapView.onSaveInstanceState(out);
    }
}
