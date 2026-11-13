package br.com.horizon.maxvel;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Dados e ações pendentes de campo: SQLite PRIVADO do Android; nunca simula aceite do COI. */
public final class NativeOfflineStore extends SQLiteOpenHelper {
    private final Context ctx;
    private final ExecutorService sender=Executors.newSingleThreadExecutor();
    private static final String API="https://maxvel.hzsys.tech/api";
    NativeOfflineStore(Context context){super(context,"ronda-offline-v1.sqlite",null,1);ctx=context.getApplicationContext();}
    @Override public void onCreate(SQLiteDatabase db){
        db.execSQL("CREATE TABLE IF NOT EXISTS cached (identity TEXT NOT NULL, path TEXT NOT NULL, data TEXT NOT NULL, saved INTEGER NOT NULL, PRIMARY KEY(identity,path))");
        db.execSQL("CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, identity TEXT NOT NULL, token TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, data TEXT NOT NULL, saved INTEGER NOT NULL)");
    }
    @Override public void onUpgrade(SQLiteDatabase db,int old,int next){}
    private static boolean safe(String path){return path!=null&&path.matches("^/[a-zA-Z0-9_/?=&.,%-]{1,255}$")&&!path.contains("..")&&!path.contains("//");}
    private static String identity(String token){
        if(token==null||token.length()<10)return "anonymous";
        try{byte[] bytes=MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));StringBuilder b=new StringBuilder();for(byte x:bytes)b.append(String.format("%02x",x));return b.toString();}catch(Exception e){return "unavailable";}
    }
    @JavascriptInterface public synchronized String read(String path,String token){
        if(!safe(path))return "";
        try(Cursor c=getReadableDatabase().rawQuery("SELECT data FROM cached WHERE identity=? AND path=?",new String[]{identity(token),path})){
            return c.moveToFirst()?c.getString(0):"";
        }
    }
    @JavascriptInterface public synchronized void cache(String path,String token,String body){
        if(!safe(path)||body==null||body.length()>950000)return;
        try{new JSONObject(body);}catch(Exception e){return;}
        getWritableDatabase().execSQL("INSERT OR REPLACE INTO cached(identity,path,data,saved) VALUES(?,?,?,?)",new Object[]{identity(token),path,body,System.currentTimeMillis()});
    }
    @JavascriptInterface public synchronized String queue(String method,String path,String token,String body){
        if(!safe(path)||!"POST".equals(method)&&!"PUT".equals(method)||body==null||body.length()>900000||token==null||token.length()<10)
            return "{\"error\":\"operacao_offline_nao_suportada\"}";
        if(!path.equals("/qr/verify")&&!path.equals("/events")&&!path.equals("/presence")&&!path.equals("/presence/off")&&!path.equals("/app-state")&&!path.matches("^/chat/conversations/[a-zA-Z0-9-]{8,80}/messages$")&&!path.startsWith("/dispatches/"))
            return "{\"error\":\"operacao_exige_conexao\"}";
        try{new JSONObject(body);}catch(Exception e){return "{\"error\":\"corpo_invalido\"}";}
        getWritableDatabase().execSQL("INSERT INTO outbox(identity,token,method,path,data,saved) VALUES(?,?,?,?,?,?)",
            new Object[]{identity(token),token,method,path,body,System.currentTimeMillis()});
        return "{\"offline\":true,\"pendingSync\":true,\"ok\":true}";
    }
    @JavascriptInterface public synchronized int pending(){
        try(Cursor c=getReadableDatabase().rawQuery("SELECT COUNT(*) FROM outbox",null)){return c.moveToFirst()?c.getInt(0):0;}
    }
    @JavascriptInterface public void flush(){sender.execute(()->{
        while(true){long id;String method,path,body,token;
            synchronized(this){
                try(Cursor c=getReadableDatabase().rawQuery("SELECT id,method,path,data,token FROM outbox ORDER BY id LIMIT 1",null)){
                    if(!c.moveToFirst())return;id=c.getLong(0);method=c.getString(1);path=c.getString(2);body=c.getString(3);token=c.getString(4);
                }
            }
            HttpURLConnection connection=null;
            try{
                connection=(HttpURLConnection)new URL(API+path).openConnection();connection.setConnectTimeout(6000);connection.setReadTimeout(8000);
                connection.setRequestMethod(method);connection.setRequestProperty("Authorization","Bearer "+token);
                connection.setRequestProperty("Content-Type","application/json; charset=utf-8");connection.setDoOutput(true);
                try(OutputStream output=connection.getOutputStream()){output.write(body.getBytes(StandardCharsets.UTF_8));}
                int code=connection.getResponseCode();
                if(code<200||code>=300)return;
                synchronized(this){getWritableDatabase().execSQL("DELETE FROM outbox WHERE id=?",new Object[]{id});}
            }catch(Exception e){return;}
            finally{if(connection!=null)connection.disconnect();}
        }
    });}
    void shutdown(){sender.shutdown();close();}
}
