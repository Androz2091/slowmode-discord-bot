import { Client, Snowflake } from "discord.js";
import config from "./config.json";

interface SlowmodeRoleData {
  roleID: Snowflake;
  time: number;
}

interface SlowmodeData {
  channelID: Snowflake;
  slowmodes: SlowmodeRoleData[];
}

const slowmodes: SlowmodeData[] = [];
config.slowmodes.forEach((slowmode) => {
  slowmodes.push({
    channelID: slowmode.channelID,
    slowmodes: slowmode.slowmodes.map((slowmodeRole) => {
      return {
        roleID: slowmodeRole.roleID,
        time: 1000 * 60 * 2,
      };
    }),
  });
});

const client = new Client();
client.login(config.token);

client.on("ready", () => {
  console.log(`Ready. Logged as ${client.user.tag}`);
});

client.on("message", (message) => {
  if (message.author.bot) return;

  const channelSlowmodeData = slowmodes.find((slowmode) => slowmode.channelID === message.channel.id);
  if (!channelSlowmodeData) return;

  const lastMessageDate = parseInt(get(`${message.author.id}${message.channel.id}`) || 0);
  let slowmode: SlowmodeRoleData = null;
  message.member.roles.cache
    .sort((a, b) => a.position - b.position)
    .forEach((role) => {
      const slowmodeRole = channelSlowmodeData.slowmodes.find((slowmode) => slowmode.roleID === role.id);
      if (slowmodeRole) slowmode = slowmodeRole;
    });
  if (!slowmode) return;

  const canSendMessageDate = slowmode.time + lastMessageDate;

  if (canSendMessageDate > Date.now()) {
    if (message.deletable) message.delete();

    const time = canSendMessageDate - Date.now()
    message.member
      .send(
        config.messages.waitMP
          .replace("{{time}}", time.toString())
          .replace("{{user}}", message.author.toString())
          .replace("{{channel}}", message.channel.toString())
      )
      .catch(() => {
        message
          .reply(
            config.messages.wait
              .replace("{{time}}", time.toString())
              .replace("{{user}}", message.author.toString())
              .replace("{{channel}}", message.channel.toString())
          )
          .then((m) => {
            m.delete({
              timeout: 2000,
            });
          });
      });
  } else {
    set(`${message.author.id}${message.channel.id}`, Date.now().toString()); // todo: when TrueXPixels/quick.db/pull/163 is merged, remove toString()
  }
});
