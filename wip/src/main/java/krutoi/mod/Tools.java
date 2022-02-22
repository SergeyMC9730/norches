package krutoi.mod;

import java.util.Collection;

import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitTask;

public class Tools {
    public App plugin;
    public int getTicks(int seconds){
        return seconds * 20;
    }
    public long[][] ticks = new long[1024][3];
    public short avaliableTickPointer = 0;

    //temps
    public boolean isReadyTemp = false;
    public short tickpTemp = 0;

    public BukkitTask createTimer(Runnable task, int t){
        isReadyTemp = false;
        tickpTemp = 0;
        BukkitTask ret = plugin.getServer().getScheduler().runTaskTimer((Plugin)plugin, new Runnable() {
            short tickPointer = 0;
            boolean isReady = false;
            boolean initState = false;

            @Override
            public void run(){
                if(isReadyTemp || isReady){
                    if(!initState){
                        isReady = isReadyTemp;
                        tickPointer = tickpTemp;
                        initState = true;
                    }
                    ticks[tickPointer][0]++;
                    ticks[tickPointer][2]++;
                    if(ticks[tickPointer][0] == t || ticks[tickPointer][0] > t){
                        task.run();
                        ticks[tickPointer][0] = 0;
                    }
                }
            }
        }, 0, 1);
        ticks[avaliableTickPointer][1] = (long)ret.getTaskId();
        tickpTemp = avaliableTickPointer;
        avaliableTickPointer++;
        isReadyTemp = true;
        plugin.getLogger().info("New timer " + ret.getTaskId() + " was made!");
        return ret;
    }
}
