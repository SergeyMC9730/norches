package krutoi.mod;

import org.bukkit.ChatColor;

public class ColorFormatter {
    public String colorFormat(String instance){
        String result = instance;
        result = result.replaceAll("<r>", ChatColor.RESET.toString());
        result = result.replaceAll("<cblack>", ChatColor.BLACK.toString());
        result = result.replaceAll("<cdb>", ChatColor.DARK_BLUE.toString());
        result = result.replaceAll("<cdgre>", ChatColor.DARK_GREEN.toString());
        result = result.replaceAll("<cda>", ChatColor.DARK_AQUA.toString());
        result = result.replaceAll("<cdr>", ChatColor.DARK_RED.toString());
        result = result.replaceAll("<cdp>", ChatColor.DARK_PURPLE.toString());
        result = result.replaceAll("<cgl>", ChatColor.GOLD.toString());
        result = result.replaceAll("<cgr>", ChatColor.GRAY.toString());
        result = result.replaceAll("<cdgra>", ChatColor.DARK_GRAY.toString());
        result = result.replaceAll("<cbl>", ChatColor.BLUE.toString());
        result = result.replaceAll("<cgre>", ChatColor.GREEN.toString());
        result = result.replaceAll("<ca>", ChatColor.AQUA.toString());
        result = result.replaceAll("<cr>", ChatColor.RED.toString());
        result = result.replaceAll("<clp>", ChatColor.LIGHT_PURPLE.toString());
        result = result.replaceAll("<cy>", ChatColor.YELLOW.toString());
        result = result.replaceAll("<cw>", ChatColor.WHITE.toString());
        result = result.replaceAll("<cm>", ChatColor.MAGIC.toString());
        return result;
    }
}
