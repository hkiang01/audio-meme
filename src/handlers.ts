import { CommandInteraction, GuildMember } from "discord.js";
import { deleteMeme, exists, pickRandom, play, record, recordYoutube } from "./audio";


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

async function playHandler(name: string, interaction: CommandInteraction, guildMember: GuildMember) {
  if (!await exists(interaction.guild, name)) {
    await interaction.reply(`❌ Error playing ${name} - not found`);
    return;
  }
  await interaction.reply(`▶ playing ${name}`);
  const err = await play(interaction.guild, guildMember.voice.channel, name);
  if (err) {
    await interaction.reply(`❌ Error playing ${name} - ${err.message}`);
  }
}

async function randomHandler(interaction: CommandInteraction, guildMember: GuildMember) {
  let [name, err] = await pickRandom(interaction.guild);
  if (err) {
    await interaction.reply(`❌ Error picking random meme - ${err.message}`);
    return;
  }
  await interaction.reply(`▶ playing ${name}`);
  err = await play(interaction.guild, guildMember.voice.channel, name);
  if (err) {
    await interaction.reply(`❌ Error playing ${name} - ${err.message}`);
    return;
  }
}

async function deleteHandler(name: string, interaction: CommandInteraction, guildMember: GuildMember) {
  if (!await exists(interaction.guild, name)) {
    await interaction.reply(`❌ Error deleting ${name} - does not exist, already deleted`);
    return;
  }
  deleteMeme(interaction.guild, name).then(async (err) => {
    if (err) {
      await interaction.reply(`❌ Error deleting ${name} - ${err.message}`);
      return;
    }
    await interaction.reply(`🗑️ deleted ${name}`);
    return;
  });
}


export const handlers = {
  recordHandler: recordHandler,
  playHandler: playHandler,
  randomHandler: randomHandler,
  deleteHandler: deleteHandler
}
