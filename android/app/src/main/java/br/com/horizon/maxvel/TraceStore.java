package br.com.horizon.maxvel;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.location.Location;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Trajeto guardado apenas no armazenamento interno privado do aparelho.
 * Limita amostras e tempo de guarda para não acumular coordenadas indefinidamente.
 * Para produção, política de retenção/criptografia e sincronização requerem validação LGPD.
 */
public class TraceStore extends SQLiteOpenHelper {
    TraceStore(Context ctx) { super(ctx, "maxvel_trace_v1.db", null, 2); }

    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE fixes (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, accuracy REAL NOT NULL, battery INTEGER)");
        db.execSQL("CREATE INDEX fixes_at ON fixes(at)");
    }
    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) { if (oldVersion < 2) db.execSQL("ALTER TABLE fixes ADD COLUMN battery INTEGER"); }

    void record(Location location, int battery) {
        if (location == null || !location.hasAccuracy()) return;
        SQLiteDatabase db = getWritableDatabase();
        android.content.ContentValues values = new android.content.ContentValues();
        values.put("at", location.getTime());values.put("lat", location.getLatitude());
        values.put("lng", location.getLongitude());values.put("accuracy", location.getAccuracy());if(battery>=0)values.put("battery", battery);
        db.insert("fixes",null,values);
        db.execSQL("DELETE FROM fixes WHERE at < ?",new Object[]{System.currentTimeMillis()-30L*24*60*60*1000});
        db.execSQL("DELETE FROM fixes WHERE id NOT IN (SELECT id FROM fixes ORDER BY id DESC LIMIT 10000)");
    }

    String after(long timestamp) {
        JSONArray items = new JSONArray();
        try(Cursor c = getReadableDatabase().rawQuery("SELECT at,lat,lng,accuracy,battery FROM fixes WHERE at > ? ORDER BY at,id LIMIT 3000",new String[]{String.valueOf(timestamp)})) {
            while(c.moveToNext()){
                JSONObject obj=new JSONObject();
                try {obj.put("at",c.getLong(0));obj.put("lat",c.getDouble(1));obj.put("lng",c.getDouble(2));obj.put("accuracy",c.getDouble(3));if(!c.isNull(4))obj.put("battery",c.getInt(4));items.put(obj);} catch(JSONException ignored){}
            }
        }
        return items.toString();
    }
}