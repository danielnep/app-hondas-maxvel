package br.com.horizon.maxvel;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.BatteryManager;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.PermissionRequest;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;

/** Web UI compartilhada com a versão de demonstração, com acesso nativo controlado.
 * Tracking começa a partir de uma ação visível durante a ronda, não ao instalar/abrir o app.
 */
public class MainActivity extends Activity {
    private static final String TRUSTED_HOST="appassets.androidplatform.net";
    private static final String APP_URL="https://appassets.androidplatform.net/assets/site/index.html";
    private static final int LOCATION_REQUEST=88;
    private static final int MEDIA_PICKER_REQUEST=101;
    private static final int CAMERA_PERMISSION_REQUEST=102;
    private static final int TORCH_PERMISSION_REQUEST=103;
    private PermissionRequest pendingCameraRequest;
    private ValueCallback<Uri[]> pendingMediaChooser;
    private WebView webView;
    private TraceStore trace;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private boolean pendingServiceStart=false;
    private String torchCameraId=null;
    private String pendingTorchRequestId=null;
    private boolean torchEnabled=false;

    private boolean hasLocation(){return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED ||checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED;}

    @Override public void onCreate(Bundle state){super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(10,49,70));getWindow().setNavigationBarColor(Color.rgb(10,49,70));
        trace=new TraceStore(this);
        WebViewAssetLoader assets=new WebViewAssetLoader.Builder().setDomain(TRUSTED_HOST)
                .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView=new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        WebSettings settings=webView.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
        webView.addJavascriptInterface(new NativeBridge(),"AndroidTracking");
        webView.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return assets.shouldInterceptRequest(request.getUrl());}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                Uri u=request.getUrl();if(TRUSTED_HOST.equals(u.getHost()))return false;
                if(request.isForMainFrame()){
                    try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}
                    return true;
                }
                return false;
            }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){
                runOnUiThread(()->{
                    if(!TRUSTED_HOST.equals(request.getOrigin().getHost())){request.deny();return;}
                    boolean wantsVideo=false;
                    for(String resource:request.getResources())if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource))wantsVideo=true;
                    if(!wantsVideo){request.deny();return;}
                    if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED){
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    }else{
                        pendingCameraRequest=request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA_PERMISSION_REQUEST);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request){
                if(pendingCameraRequest==request)pendingCameraRequest=null;
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params){
                if(pendingMediaChooser!=null)pendingMediaChooser.onReceiveValue(null);
                pendingMediaChooser=callback;
                try{
                    Intent intent=params.createIntent();
                    startActivityForResult(intent,MEDIA_PICKER_REQUEST);
                    return true;
                }catch(Exception e){
                    pendingMediaChooser.onReceiveValue(null);
                    pendingMediaChooser=null;
                    return false;
                }
            }
            @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
                if(!origin.startsWith("https://"+TRUSTED_HOST)){callback.invoke(origin,false,false);return;}
                if(hasLocation()){callback.invoke(origin,true,false);return;}
                geoOrigin=origin;geoCallback=callback;requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION_REQUEST);
            }
        });
        setContentView(webView);webView.loadUrl(APP_URL);
    }

    private void startTracking(){
        if(!hasLocation()){
            pendingServiceStart=true;
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION_REQUEST);
            return;
        }
        pendingServiceStart=false;
        Intent i=new Intent(this,PatrolLocationService.class).setAction(PatrolLocationService.START);
        try{startForegroundService(i);}catch(Exception e){webView.evaluateJavascript("console.warn('Não foi possível iniciar o rastreamento nativo.')",null);}
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},89);
    }
    private void stopTracking(){stopService(new Intent(this,PatrolLocationService.class));getSharedPreferences("tracking",MODE_PRIVATE).edit().putBoolean("active",false).apply();}

    public class NativeBridge {
        @JavascriptInterface public int getBatteryLevel(){BatteryManager battery=(BatteryManager)getSystemService(BATTERY_SERVICE);return battery==null?-1:battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);}
        @JavascriptInterface public void startTracking(){runOnUiThread(()->MainActivity.this.startTracking());}
        @JavascriptInterface public void stopTracking(){runOnUiThread(()->MainActivity.this.stopTracking());}
        @JavascriptInterface public String getLocationsSince(long at){return trace.after(at);}
        @JavascriptInterface public boolean isTrackingActive(){return getSharedPreferences("tracking",MODE_PRIVATE).getBoolean("active",false);}
        // Nunca solicitar permissão ou ligar o flash ao abrir o app. A interface
        // chama este método somente após um toque no botão de lanterna.
        @JavascriptInterface public void setTorchEnabled(boolean enabled,String requestId){
            if(requestId==null||!requestId.matches("[a-zA-Z0-9:-]{1,64}"))return;
            runOnUiThread(()->setNativeTorch(enabled,requestId));
        }
    }

    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){
        super.onRequestPermissionsResult(code,permissions,results);
        if(code==CAMERA_PERMISSION_REQUEST&&pendingCameraRequest!=null){
            if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)
                pendingCameraRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingCameraRequest.deny();
            pendingCameraRequest=null;
        }
        if(code==TORCH_PERMISSION_REQUEST&&pendingTorchRequestId!=null){
            String id=pendingTorchRequestId;
            pendingTorchRequestId=null;
            if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)
                setNativeTorch(true,id);
            else sendTorchResult(id,false,"camera-permission");
        }
        if(code==LOCATION_REQUEST){
            boolean allowed=hasLocation();
            if(geoCallback!=null){geoCallback.invoke(geoOrigin,allowed,false);geoCallback=null;geoOrigin=null;}
            if(pendingServiceStart){if(allowed)startTracking();pendingServiceStart=false;}
        }
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==MEDIA_PICKER_REQUEST&&pendingMediaChooser!=null){
            pendingMediaChooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));
            pendingMediaChooser=null;
        }
    }
    /** Seleciona somente câmera traseira que realmente possua flash. */
    private String findTorchCamera() throws CameraAccessException {
        CameraManager manager=(CameraManager)getSystemService(CAMERA_SERVICE);
        if(manager==null)return null;
        for(String id:manager.getCameraIdList()){
            CameraCharacteristics traits=manager.getCameraCharacteristics(id);
            Boolean hasFlash=traits.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
            Integer facing=traits.get(CameraCharacteristics.LENS_FACING);
            if(Boolean.TRUE.equals(hasFlash)&&facing!=null&&facing==CameraCharacteristics.LENS_FACING_BACK)
                return id;
        }
        return null;
    }

    private void sendTorchResult(String id,boolean enabled,String error){
        if(webView==null)return;
        try{
            JSONObject result=new JSONObject();
            result.put("requestId",id);
            result.put("enabled",enabled);
            if(error!=null)result.put("error",error);
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('rondas-native-torch-result',{detail:"+result.toString()+"}))",null);
        }catch(Exception ignored){}
    }

    private void setNativeTorch(boolean enabled,String requestId){
        // Apagar cancela uma solicitação de permissão que ainda não foi concluída.
        if(!enabled)pendingTorchRequestId=null;
        if(enabled&&!getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH)){
            sendTorchResult(requestId,false,"torch-unavailable");return;
        }
        if(enabled&&checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED){
            pendingTorchRequestId=requestId;
            requestPermissions(new String[]{Manifest.permission.CAMERA},TORCH_PERMISSION_REQUEST);
            return;
        }
        try{
            CameraManager manager=(CameraManager)getSystemService(CAMERA_SERVICE);
            if(manager==null)throw new IllegalStateException("CameraManager indisponível");
            if(enabled&&torchCameraId==null)torchCameraId=findTorchCamera();
            if(enabled&&torchCameraId==null){sendTorchResult(requestId,false,"torch-unavailable");return;}
            if(torchCameraId!=null)manager.setTorchMode(torchCameraId,enabled);
            torchEnabled=enabled;
            sendTorchResult(requestId,enabled,null);
        }catch(CameraAccessException e){
            torchEnabled=false;
            String kind=(e.getReason()==CameraAccessException.CAMERA_IN_USE||
                e.getReason()==CameraAccessException.MAX_CAMERAS_IN_USE)?"camera-busy":"torch-unavailable";
            sendTorchResult(requestId,false,kind);
        }catch(SecurityException e){
            torchEnabled=false;sendTorchResult(requestId,false,"camera-permission");
        }catch(Exception e){
            torchEnabled=false;sendTorchResult(requestId,false,"torch-unavailable");
        }
    }

    @Override protected void onPause(){
        // A tela de permissão pode pausar a Activity temporariamente.
        // Não descartar a solicitação pendente; ela será resolvida no callback.
        if(torchEnabled)setNativeTorch(false,"");
        super.onPause();
    }
    @Override public void onBackPressed(){if(webView.canGoBack())webView.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(torchEnabled)setNativeTorch(false,"");if(webView!=null){webView.destroy();}if(trace!=null)trace.close();super.onDestroy();}
}