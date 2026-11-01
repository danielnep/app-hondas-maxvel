package br.com.horizon.maxvel;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.InputStream;
import java.net.URL;
import java.net.HttpURLConnection;
import java.util.Collections;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** APK Android REAL: a interface Glass aprovada vem embutida em /assets/app, nao de um site remoto. */
public final class MainActivity extends Activity implements SensorEventListener,LocationListener {
    private static final String ORIGIN="https://maxvel.hzsys.tech";
    private static final int LOCATION=201,CAMERA=202,FILES=203;
    private final ExecutorService background=Executors.newSingleThreadExecutor();
    private WebView web;
    private NativeOfflineStore offline;
    private LocationManager locations;
    private SensorManager sensors;
    private Sensor rotation;
    private Location lastFix;
    private String torchId;
    private CameraManager cameras;
    private boolean torchOn=false;
    private long lastCompassEvent=0;
    private PermissionRequest pendingCamera;
    private ValueCallback<Uri[]> fileRequest;
    private final Bridge bridge=new Bridge();

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(0xff14181e);
        getWindow().setNavigationBarColor(0xff14181e);
        getWindow().getDecorView().setSystemUiVisibility(0);
        locations=(LocationManager)getSystemService(LOCATION_SERVICE);
        sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
        cameras=(CameraManager)getSystemService(CAMERA_SERVICE);
        rotation=sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        offline=new NativeOfflineStore(this);
        web=new WebView(this);web.setBackgroundColor(0xff161b21);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        // O HTML aprovado ocupa toda a área útil. Não há faixa nativa adicional.
        FrameLayout layout=new FrameLayout(this);
        layout.setBackgroundColor(0xff14181e);
        layout.addView(web,new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,FrameLayout.LayoutParams.MATCH_PARENT));
        if(Build.VERSION.SDK_INT>=30){
            // Um único proprietário dos insets: Android reserva; WebView não repete.
            getWindow().setDecorFitsSystemWindows(false);
            layout.setOnApplyWindowInsetsListener((view,insets)->{
                android.graphics.Insets safe=insets.getInsets(
                    WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
                int bottom=Math.max(safe.bottom,insets.getInsets(WindowInsets.Type.ime()).bottom);
                view.setPadding(safe.left,safe.top,safe.right,bottom);
                return WindowInsets.CONSUMED;
            });
        }
        // Em Android 8–10, o decor padrão já fornece a área útil, sem padding extra.
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(offline,"RondaOffline");
        web.addJavascriptInterface(bridge,"AndroidTracking");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();String host=uri.getHost(),path=uri.getPath();
                if(host==null||path==null)return null;
                if(host.equals("maxvel.hzsys.tech")&&"https".equals(uri.getScheme())){
                    if(path.startsWith("/api/"))return null; // autenticação e dados continuam na VPS
                    String local=null;
                    if(path.startsWith("/app/"))local="app/"+path.substring(5);
                    else if(path.startsWith("/assets/")||path.startsWith("/src/"))local="app"+path;
                    else if(path.equals("/index.html")||path.equals("/central.html")||path.equals("/manifest.webmanifest"))local="app"+path;
                    if(local!=null&&!local.contains("..")){
                        try{
                            String ext=local.substring(local.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
                            String type=ext.equals("js")?"application/javascript":ext.equals("css")?"text/css":ext.equals("html")?"text/html":ext.equals("svg")?"image/svg+xml":ext.equals("webp")?"image/webp":ext.equals("png")?"image/png":ext.equals("woff2")?"font/woff2":ext.equals("json")||ext.equals("webmanifest")?"application/json":"application/octet-stream";
                            InputStream stream=getAssets().open(local);
                            WebResourceResponse response=new WebResourceResponse(type,"UTF-8",stream);
                            response.setResponseHeaders(Collections.singletonMap("Cache-Control","no-store"));
                            return response;
                        }catch(Exception error){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new java.io.ByteArrayInputStream(new byte[0]));}
                    }
                }
                return null;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if("maxvel.hzsys.tech".equals(uri.getHost())&&"https".equals(uri.getScheme()))return false;
                try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){Toast.makeText(MainActivity.this,"Link indisponível",Toast.LENGTH_SHORT).show();}
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
                boolean allowed=trustedOrigin(android.net.Uri.parse(origin))&&checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;
                callback.invoke(origin,allowed,false);
                if(!allowed)requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION);
            }
            @Override public void onPermissionRequest(PermissionRequest request){
                if(!trustedOrigin(request.getOrigin())){request.deny();return;}
                for(String resource:request.getResources())if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)){
                    if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED){request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});return;}
                    pendingCamera=request;requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA);return;
                }
                request.deny();
            }
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileRequest!=null)fileRequest.onReceiveValue(null);
                fileRequest=callback;
                try{startActivityForResult(params.createIntent(),FILES);return true;}
                catch(Exception e){fileRequest=null;callback.onReceiveValue(null);return false;}
            }
        });
        setContentView(layout);
        layout.requestApplyInsets();
        web.loadUrl(ORIGIN+"/app/index.html");
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},204);
        if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION);
    }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){
        super.onRequestPermissionsResult(request,permissions,results);
        if(request==CAMERA&&pendingCamera!=null){
            PermissionRequest saved=pendingCamera;pendingCamera=null;
            if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)saved.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else saved.deny();
        }
        if(request==LOCATION&&results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED){trackLocation();startPresenceService();}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==FILES&&fileRequest!=null){fileRequest.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));fileRequest=null;}
    }
    private boolean trustedOrigin(Uri uri){
        return uri!=null&&"https".equals(uri.getScheme())&&"maxvel.hzsys.tech".equals(uri.getHost());
    }
    private void trackLocation(){
        if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED)return;
        try{locations.requestLocationUpdates(LocationManager.GPS_PROVIDER,1500,1f,this);locations.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,3000,3f,this);}catch(Exception ignored){}
    }
    private void js(String javascript){if(web!=null)web.post(()->web.evaluateJavascript(javascript,null));}
    private void event(String name,JSONObject data){js("window.dispatchEvent(new CustomEvent("+JSONObject.quote(name)+",{detail:"+data.toString()+"}));");}
    @Override public void onLocationChanged(Location fix){
        lastFix=fix;JSONObject pos=new JSONObject();
        try{pos.put("lat",fix.getLatitude()).put("lng",fix.getLongitude()).put("accuracy",fix.getAccuracy()).put("speed",fix.hasSpeed()?fix.getSpeed():0);pos.put("at",fix.getTime());if(fix.hasBearing())pos.put("bearing",fix.getBearing());}catch(Exception ignored){}
        event("rondapro:native-location",pos);
    }
    @Override public void onSensorChanged(SensorEvent sensor){
        if(sensor.sensor.getType()!=Sensor.TYPE_ROTATION_VECTOR)return;
        if(android.os.SystemClock.elapsedRealtime()-lastCompassEvent<350)return;
        lastCompassEvent=android.os.SystemClock.elapsedRealtime();
        float[] matrix=new float[9],angles=new float[3];
        SensorManager.getRotationMatrixFromVector(matrix,sensor.values);
        SensorManager.getOrientation(matrix,angles);
        float magnetic=(float)Math.toDegrees(angles[0]);float declination=0;
        if(lastFix!=null){GeomagneticField field=new GeomagneticField((float)lastFix.getLatitude(),(float)lastFix.getLongitude(),(float)lastFix.getAltitude(),System.currentTimeMillis());declination=field.getDeclination();}
        float heading=((magnetic+declination)%360+360)%360;
        if(lastFix!=null&&lastFix.hasBearing()&&lastFix.getSpeed()>2.2f)heading=lastFix.getBearing();
        JSONObject data=new JSONObject();try{data.put("heading",Math.round(heading*10)/10.0);data.put("source",lastFix!=null&&lastFix.hasBearing()&&lastFix.getSpeed()>2.2f?"gps":"compass");}catch(Exception ignored){}
        event("rondapro:native-heading",data);
    }
    @Override public void onAccuracyChanged(Sensor sensor,int accuracy){}
    private void torch(boolean enabled,String id){
        JSONObject response=new JSONObject();
        try{
            if(torchId==null){for(String candidate:cameras.getCameraIdList()){
                CameraCharacteristics data=cameras.getCameraCharacteristics(candidate);
                Boolean flash=data.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                Integer facing=data.get(CameraCharacteristics.LENS_FACING);
                if(Boolean.TRUE.equals(flash)&&facing!=null&&facing==CameraCharacteristics.LENS_FACING_BACK){torchId=candidate;break;}
            }}
            if(torchId==null)throw new IllegalStateException("Flash traseiro indisponível");
            cameras.setTorchMode(torchId,enabled);torchOn=enabled;
            response.put("enabled",enabled);
        }catch(Exception error){try{response.put("enabled",false);response.put("error","torch-unavailable");}catch(Exception ignored){}}
        try{response.put("requestId",id);}catch(Exception ignored){}
        event("rondas-native-torch-result",response);
    }
    private void startPresenceService(){
        if(!getSharedPreferences("tracking",MODE_PRIVATE).getBoolean("shiftActive",false)||NativeApi.token(this).isEmpty()||checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED)return;
        try{startForegroundService(new Intent(this,PatrolLocationService.class).setAction(PatrolLocationService.START_SHIFT).putExtra("roundId",""));}catch(Exception ignored){}
    }
    private final class Bridge{
        @JavascriptInterface public void rememberToken(String token){if(token!=null&&token.length()>10)NativeApi.saveLogin(MainActivity.this,token,"agente");}
        @JavascriptInterface public void startShift(){getSharedPreferences("tracking",MODE_PRIVATE).edit().putBoolean("shiftActive",true).apply();runOnUiThread(()->startPresenceService());}
        @JavascriptInterface public void forgetToken(){getSharedPreferences("tracking",MODE_PRIVATE).edit().putBoolean("shiftActive",false).apply();NativeApi.logout(MainActivity.this);runOnUiThread(()->stopService(new Intent(MainActivity.this,PatrolLocationService.class)));}
        @JavascriptInterface public void startTracking(String roundId){
            if(roundId==null||roundId.length()<8||NativeApi.token(MainActivity.this).isEmpty())return;
            Intent intent=new Intent(MainActivity.this,PatrolLocationService.class).setAction(PatrolLocationService.START).putExtra("roundId",roundId);
            try{startForegroundService(intent);}catch(Exception error){js("console.warn('GPS nativo ainda sem permissão')");}
        }
        @JavascriptInterface public void stopTracking(){try{startService(new Intent(MainActivity.this,PatrolLocationService.class).setAction(PatrolLocationService.STOP_ROUTE));}catch(Exception ignored){}}
        @JavascriptInterface public void setTorchEnabled(boolean enabled,String requestId){runOnUiThread(()->torch(enabled,requestId));}
    }
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();trackLocation();startPresenceService();if(rotation!=null)sensors.registerListener(this,rotation,SensorManager.SENSOR_DELAY_UI);if(offline!=null)offline.flush();}
    @Override protected void onPause(){if(torchOn)torch(false,"");sensors.unregisterListener(this);if(locations!=null)locations.removeUpdates(this);if(web!=null)web.onPause();super.onPause();}
    @Override protected void onDestroy(){if(fileRequest!=null)fileRequest.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("AndroidTracking");web.removeJavascriptInterface("RondaOffline");web.destroy();web=null;}if(offline!=null)offline.shutdown();background.shutdown();super.onDestroy();}
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
}
