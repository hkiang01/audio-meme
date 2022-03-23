import { client } from './client';
import { Routes } from 'discord-api-types/v9';
import {CLIENT_ID, DISCORD_BOT_TOKEN} from './constants';
import { REST } from '@discordjs/rest';

import { SlashCommandBuilder } from '@discordjs/builders';
import { deleteMeme, exists, pickRandom, play, playIntro, record, recordYoutube } from './audio';
import { GuildMember } from 'discord.js';
import fs from 'fs';


const slashCommand = new SlashCommandBuilder()
  .setName("audiomeme")
  .setDescription("cuz why not?")
  .addSubcommand(subcommand => 
    subcommand
    .setName("record")
    .setDescription("Record an audio meme")
    .addStringOption(option =>
      option
      .setName("name")
      .setDescription("What to name the saved audio meme, used for retrieval")
      .setRequired(true)
    )
    .addStringOption(option =>
      option
      .setName("youtubeurl")
      .setDescription("Create an audio meme using audio from a youtube video")
    )
  ).addSubcommand(subCommand =>
    subCommand
    .setName("play")
    .setDescription("Play an audio meme")
    .addStringOption(option =>
      option
      .setName("name")
      .setDescription("What the saved audio meme was named")
      .setRequired(true)
    )
  ).addSubcommand(subCommand =>
   subCommand
   .setName("delete")
   .setDescription("Delete an audio meme")
   .addStringOption(option =>
    option
    .setName("name")
    .setDescription("The audio meme to delete")
    .setRequired(true)
    )
  ).addSubcommand(subCommand =>
    subCommand
    .setName("random")
    .setDescription("Play a random audio meme")
  ).addSubcommand(subCommand =>
    subCommand
    .setName("setintro")
    .setDescription("Set a sound to play after joining a voice channel in the guild")
    .addStringOption(option =>
      option
      .setName("name")
      .setDescription("The sound that will play when joining a voice channel in the guild")
      .setRequired(true)
  ));

const rest = new REST({version: '9'}).setToken(DISCORD_BOT_TOKEN);

client.on('interactionCreate', async interaction => {
  if (interaction.user.bot) return;
  if (!interaction.isCommand()) return;
  if (interaction.commandName !== 'audiomeme') return;
  if (!interaction.guild) {
    await interaction.reply({ephemeral: true, content: 'audiomeme only works in guild text channels'});
    return;
  }
  if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
    await interaction.reply({ephemeral: true, content: 'Join a voice channel and try again'});
    return;
  }
  const guildMember: GuildMember = interaction.member;

  // security
  const name: string = interaction.options.getString("name");
  if (name) {
    if (!((/^[\w\- ]{0,50}$/).test(name))) {
      await interaction.reply({ephemeral: true, content: 'Invalid name, can only contain alphanumeric characters, spaces, and dashes, and cannot be longer than 50 characters'})
      return;
    }
  }

  let err: Error = undefined;
  let memeExists: boolean = undefined;
  switch (interaction.options.getSubcommand()) {
    case 'record':
      if (await exists(interaction.guild, name)) {
        await interaction.reply(`❌ Error recording ${name} - ${name} exists. Please delete and re-record`);
        return;
      }
      const youtubeUrl = interaction.options.getString('youtubeurl');
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
      break;
    case 'play':
      memeExists = !await exists(interaction.guild, name)
      if (memeExists) {
        await interaction.reply(`❌ Error playing ${name} - not found`);
        break;
      }
      await interaction.reply(`▶ playing ${name}`);
      err = await play(interaction.guild, guildMember.voice.channel, name);
      if (err) {
        await interaction.reply(`❌ Error playing ${name} - ${err.message}`);
      }
      break;
    case 'random':
      pickRandom(interaction.guild).then( async ([name, err]) => {
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
      })
      break;
    case 'delete':
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
      break;
    case 'setintro':
      fs.copyFile(`./recordings/${interaction.guild.id}/${name}.ogg`, `./intros/${interaction.guild.id}/${interaction.user.id}.ogg`, async () => {
        await interaction.reply(`✅ Successfully set ${interaction.user.username}'s intro to ${name}`);
      })
      break;
    default:
      await interaction.reply({ephemeral: true, content: 'Available subcommands: record, play, delete, random, setintro'});
      break;
  }
  return;
});

(async() => {
  try {

    // register commands
    await rest.post(
      Routes.applicationCommands(CLIENT_ID), {body: slashCommand}
    );
    console.log(`Successfully registered /${slashCommand.name} commands.`);
  } catch (error) {
    console.error(error);
  }
})();

// intros
client.on('voiceStateUpdate', (voiceState) => {
  const guild = voiceState.guild;
  const channel = voiceState.channel;
  const member = voiceState.member;
  fs.access(`./intros/${guild.id}/${member.id}`, async () => {
    await playIntro(guild, channel, member);
  })
});

// log when bot is ready
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(DISCORD_BOT_TOKEN);
