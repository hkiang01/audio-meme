import { CommandInteraction, GuildMember } from "discord.js";
import { exists, record, recordYoutube } from "./audio";


async function recordHandler(name: string, interaction: CommandInteraction,  guildMember: GuildMember) {
  if (await exists(interaction.guild, name)) {
    await interaction.reply(`❌ Error recording ${name} - ${name} exists. Please delete and re-record`);
    return;
  }
  const youtubeUrl = interaction.options.getString('youtubeurl');
  let err: Error = undefined;
  if (youtubeUrl) {
    await interaction.reply(`🔴 recording ${name} from ${youtubeUrl}`);
    err = await recordYoutube(interaction.guild, name, youtubeUrl);
  } else {
    await interaction.reply(`🔴 recording ${name} from ${interaction.user.username}'s mic`);
    err = await record(interaction.guild, guildMember.voice.channel, interaction.user, name);
  }
  if (err) {
    await interaction.followUp(`❌ Error recording ${name} - ${err.message}`);
    return;
  } else {
    await interaction.followUp(`✅ Successfully recorded ${name}`);
  }
}

export const handlers = {
  recordHandler: recordHandler
}
