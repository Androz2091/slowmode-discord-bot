import { Client, Snowflake } from "discord.js";
import { get, set } from "quick.db";
import ms from "ms";
import * as config from "./config.json";
import moment from "moment";
moment.locale(config.locale);

interface SlowmodeRoleData {
    roleID: Snowflake;
    time: number;
};

interface SlowmodeData {
    channelID: Snowflake;
    slowmodes: SlowmodeRoleData[];
};

const slowmodes: SlowmodeData[] = [];
config.slowmodes.forEach((slowmode) => {
    slowmodes.push({
        channelID: slowmode.channelID,
        slowmodes: slowmode.slowmodes.map((slowmodeRole) => {
            return {
                roleID: slowmodeRole.roleID,
                time: ms(slowmodeRole.time)
            };
        })
    });
});

const client = new Client();
client.login(config.token);

client.on("ready", () => {
    console.log(`Ready. Logged as ${client.user.tag}`);
});

client.on("message", (message) => {
    if(message.author.bot) return;
    const channelSlowmodeData = slowmodes.find((slowmode) => slowmode.channelID === message.channel.id);
    if(!channelSlowmodeData) return;
    const lastMessageDate = parseInt((get(`${message.author.id}${message.channel.id}`) || 0));
    let slowmode: SlowmodeRoleData = null;
    message.member.roles.cache.sort((a, b) => a.position - b.position).forEach((role) => {
        const slowmodeRole = channelSlowmodeData.slowmodes.find((slowmode) => slowmode.roleID === role.id);
        if(slowmodeRole) slowmode = slowmodeRole;
    });
    if(!slowmode) return;
    const canSendMessageDate = slowmode.time + lastMessageDate;
    if(canSendMessageDate > Date.now()){
        if(message.deletable) message.delete();
        try {
            message.member.send(
                config.messages.waitMP
                .replace("{{time}}", moment.duration(canSendMessageDate-Date.now(), "milliseconds").humanize(true))
                .replace("{{user}}", message.author.toString())
                .replace("{{channel}}", message.channel.toString())
            );
        } catch (e) {
            message.reply(
                config.messages.wait
                .replace("{{time}}", moment.duration(canSendMessageDate-Date.now(), "milliseconds").humanize(true))
                .replace("{{user}}", message.author.toString())
                .replace("{{channel}}", message.channel.toString())
            ).then((m) => {
                m.delete({
                    timeout: 2000
                });
            });
        }
    } else {
        set(`${message.author.id}${message.channel.id}`, Date.now().toString()); // todo: when TrueXPixels/quick.db/pull/163 is merged, remove toString()
    }
});
