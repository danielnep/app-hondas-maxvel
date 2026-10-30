package br.com.horizon.maxvel;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

final class NativeApi {
    static final String BASE = "https://ronda-pro.2.25.83.47.sslip.io";
    private static final String PREFS = "ronda_native_auth";
    static void saveLogin(Context ctx,String token,String username){
        ctx.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString("token",token).putString("username",username).apply();
    }
    static String token(Context ctx){return ctx.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString("token","");}
    static void logout(Context ctx){ctx.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().clear().apply();}
    static JSONObject call(Context ctx,String path,String method,JSONObject data)throws Exception{
        if(!path.startsWith("/api/"))throw new IllegalArgumentException("Caminho externo bloqueado");
        HttpURLConnection conn=(HttpURLConnection)new URL(BASE+path).openConnection();
        conn.setConnectTimeout(12000);conn.setReadTimeout(15000);
        conn.setRequestMethod(method);conn.setRequestProperty("Accept","application/json");
        String token=token(ctx);
        if(!token.isEmpty())conn.setRequestProperty("Authorization","Bearer "+token);
        if(data!=null){
            conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json; charset=utf-8");
            try(OutputStream out=conn.getOutputStream()){out.write(data.toString().getBytes(StandardCharsets.UTF_8));}
        }
        int status=conn.getResponseCode();
        InputStream input=status>=400?conn.getErrorStream():conn.getInputStream();
        String raw="";
        if(input!=null){try(InputStream in=input){java.io.ByteArrayOutputStream buffer=new java.io.ByteArrayOutputStream();byte[] bytes=new byte[4096];int n;while((n=in.read(bytes))!=-1)buffer.write(bytes,0,n);raw=buffer.toString("UTF-8");}}
        conn.disconnect();
        JSONObject json=raw.isEmpty()?new JSONObject():new JSONObject(raw);
        if(status>=400)throw new ApiException(status,json.optString("error","Erro do servidor: "+status));
        return json;
    }
    static final class ApiException extends Exception{
        final int status;
        ApiException(int status,String message){super(message);this.status=status;}
    }
}
