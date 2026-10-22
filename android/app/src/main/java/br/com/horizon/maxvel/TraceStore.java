package br.com.horizon.maxvel;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.location.Location;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;

/** Histórico e fila GPS persistente: amostras não enviadas aguardam rede sem bloquear a ronda. */
public final class TraceStore extends SQLiteOpenHelper {
    TraceStore(Context ctx){super(ctx,"maxvel_trace_v1.db",null,3);}
    @Override public void onCreate(SQLiteDatabase db){
        db.execSQL("CREATE TABLE fixes (id INTEGER PRIMARY KEY AUTOINCREMENT,at INTEGER NOT NULL,lat REAL NOT NULL,lng REAL NOT NULL,accuracy REAL NOT NULL,battery INTEGER)");
        db.execSQL("CREATE INDEX fixes_at ON fixes(at)");
        outbox(db);
    }
    private void outbox(SQLiteDatabase db){
        db.execSQL("CREATE TABLE IF NOT EXISTS gps_outbox (id TEXT PRIMARY KEY,round_id TEXT NOT NULL,at INTEGER NOT NULL,lat REAL NOT NULL,lng REAL NOT NULL,accuracy REAL NOT NULL,battery INTEGER NOT NULL)");
        db.execSQL("CREATE INDEX IF NOT EXISTS gps_outbox_at ON gps_outbox(at)");
    }
    @Override public void onUpgrade(SQLiteDatabase db,int oldV,int newV){
        if(oldV<2)db.execSQL("ALTER TABLE fixes ADD COLUMN battery INTEGER");
        if(oldV<3)outbox(db);
    }
    synchronized void record(Location loc,int battery){
        if(loc==null||!loc.hasAccuracy())return;
        SQLiteDatabase db=getWritableDatabase();
        ContentValues v=new ContentValues();
        v.put("at",loc.getTime());v.put("lat",loc.getLatitude());v.put("lng",loc.getLongitude());
        v.put("accuracy",loc.getAccuracy());v.put("battery",battery);
        db.insert("fixes",null,v);
        db.execSQL("DELETE FROM fixes WHERE at < ?",new Object[]{System.currentTimeMillis()-30L*86400000L});
        db.execSQL("DELETE FROM fixes WHERE id NOT IN (SELECT id FROM fixes ORDER BY id DESC LIMIT 10000)");
    }
    synchronized void enqueue(Location loc,int battery,String roundId){
        if(loc==null||!loc.hasAccuracy()||roundId==null||roundId.length()<8||loc.getAccuracy()>90)return;
        SQLiteDatabase db=getWritableDatabase();
        ContentValues row=new ContentValues();
        row.put("id",UUID.randomUUID().toString());row.put("round_id",roundId);
        row.put("at",loc.getTime());row.put("lat",loc.getLatitude());row.put("lng",loc.getLongitude());
        row.put("accuracy",loc.getAccuracy());row.put("battery",battery);
        db.insert("gps_outbox",null,row);
        // Fila controlada para não esgotar armazenamento se permanecer offline por muito tempo.
        db.execSQL("DELETE FROM gps_outbox WHERE at < ?",new Object[]{System.currentTimeMillis()-7L*86400000L});
        db.execSQL("DELETE FROM gps_outbox WHERE id NOT IN (SELECT id FROM gps_outbox ORDER BY at DESC LIMIT 25000)");
    }
    synchronized JSONArray pending(int limit){
        JSONArray result=new JSONArray();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,round_id,at,lat,lng,accuracy,battery FROM gps_outbox ORDER BY at LIMIT "+Math.max(1,Math.min(100,limit)),null)){
            while(c.moveToNext()){
                JSONObject event=new JSONObject();
                try{
                    event.put("id",c.getString(0));event.put("roundId",c.getString(1));event.put("occurredAt",c.getLong(2));
                    event.put("kind","gps");event.put("description","GPS nativo em ronda");
                    event.put("battery",c.getInt(6));
                    event.put("position",new JSONObject().put("lat",c.getDouble(3)).put("lng",c.getDouble(4)).put("accuracy",c.getDouble(5)));
                    result.put(event);
                }catch(Exception ignored){}
            }
        }
        return result;
    }
    synchronized void markSent(String id){getWritableDatabase().delete("gps_outbox","id=?",new String[]{id});}
    synchronized int countPending(){
        try(Cursor c=getReadableDatabase().rawQuery("SELECT COUNT(*) FROM gps_outbox",null)){return c.moveToFirst()?c.getInt(0):0;}
    }
    synchronized String after(long timestamp){
        JSONArray items=new JSONArray();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT at,lat,lng,accuracy,battery FROM fixes WHERE at > ? ORDER BY at,id LIMIT 3000",new String[]{String.valueOf(timestamp)})){
            while(c.moveToNext()){
                JSONObject item=new JSONObject();
                try{item.put("at",c.getLong(0));item.put("lat",c.getDouble(1));item.put("lng",c.getDouble(2));
                    item.put("accuracy",c.getDouble(3));item.put("battery",c.getInt(4));items.put(item);}
                catch(Exception ignored){}
            }
        }
        return items.toString();
    }
}
