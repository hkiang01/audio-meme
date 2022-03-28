import { CommandInteraction, GuildMember } from "discord.js";
import { deleteMeme, exists, pickRandom, play, record, recordYoutube } from "./audio";
import fs from 'fs';

/**
 * Records an audio meme
 * @param name the name of the meme to record
 * @param interaction the {CommandInteraction} to react to
 * @param guildMember the guild member who invoked the {CommandInteraction}
 * @returns
 */
async function recordHandler(name: string, interaction: CommandInteraction,  guildMember: GuildMember) {
  // if the meme identified by {name} already exists, prevent accidentally rewriting it
  // by prompting the {GuildMember} to explicitly delete before re-recording
  if (await exists(interaction.guild, name)) {
    await interaction.reply(`❌ Error recording ${name} - ${name} exists. Please delete and re-record`);
    return;
  }

  const youtubeUrl = interaction.options.getString('youtubeurl');
  let err: Error = undefined;
  if (youtubeUrl) {
    // record the audio feed of a youtube video
    await interaction.reply(`🔴 recording ${name} from ${youtubeUrl}`);
    err = await recordYoutube(interaction.guild, name, youtubeUrl);
  } else {
    // record the voice of the {GuildMember}
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

/**
 * Plays an audio meme
 * @param name the name of the meme to play
 * @param interaction the {CommandInteraction} to react to
 * @param guildMember the {GuildMember} who invoked the {CommandInteraction}
 * @returns
 */
async function playHandler(name: string, interaction: CommandInteraction, guildMember: GuildMember) {
  // if the meme identified by {name} does not exist, reply with an error
  if (!await exists(interaction.guild, name)) {
    await interaction.reply(`❌ Error playing ${name} - not found`);
    return;
  }
  await interaction.reply(`▶ playing ${name}`);
  // play the meme
  const err = await play(interaction.guild, guildMember.voice.channel, name);
  if (err) {
    await interaction.reply(`❌ Error playing ${name} - ${err.message}`);
  }
}

/**
 * Plays a random audio meme
 * @param interaction the {CommandInteraction} to react to
 * @param guildMember the {GuildMember} who invoked the {CommandInteraction}
 * @returns 
 */
async function randomHandler(interaction: CommandInteraction, guildMember: GuildMember) {
  // pick a random meme
  let [name, err] = await pickRandom(interaction.guild);
  if (err) {
    await interaction.reply(`❌ Error picking random meme - ${err.message}`);
    return;
  }
  await interaction.reply(`▶ playing ${name}`);
  // play the randomly picked meme
  err = await play(interaction.guild, guildMember.voice.channel, name);
  if (err) {
    await interaction.reply(`❌ Error playing ${name} - ${err.message}`);
    return;
  }
}

/**
 * Deletes an audio meme
 * @param name the name of the meme to delete
 * @param interaction the {CommandInteraction} to react to
 * @returns
 */
async function deleteHandler(name: string, interaction: CommandInteraction) {
  // if a meme identified by {name} does not exist, reply with an error
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

/**
 * Sets an audio meme to be played when a {GuildMember} joins a {VoiceBasedChannel}
 * @param name the name of the meme to play when a {GuildMember} joins a {VoiceBasedChannel}
 * @param interaction the {CommandInteraction} to react to
 * @returns
 */
async function setIntroHandler(name: string, interaction: CommandInteraction) {
  // if a meme identified by {name} does not exist, prompt to pick a meme that exists
  if (!await exists(interaction.guild, name)) {
    await interaction.reply(`❌ Error setting ${interaction.member.user.username}'s intro to ${name} - does not exist. Please select an existing audio meme`);
    return;
  }
  await interaction.reply(`⌛ Setting ${interaction.member.user.username}'s intro to ${name}`);

  // create the guild specific intros directory if it does not exist
  const guildDir = `./intros/${interaction.guild.id}`;
  if (!fs.existsSync(guildDir)){
    fs.mkdirSync(guildDir);
  }

  // copy the meme file into the guild specific intros directory
  // naming the copied file that of the of the {GuildMember} who invoked the {interaction}'s id
  fs.copyFile(
    `./recordings/${interaction.guild.id}/${name}.ogg`,
    `./intros/${interaction.guild.id}/${interaction.user.id}.ogg`,
    async () => {
      await interaction.followUp(`✅ Successfully set ${interaction.user.username}'s intro to ${name}`);
      return;
    }
  );
}


export const handlers = {
  recordHandler: recordHandler,
  playHandler: playHandler,
  randomHandler: randomHandler,
  deleteHandler: deleteHandler,
  setIntroHandler: setIntroHandler
}
