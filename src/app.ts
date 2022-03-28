import { client } from './client';
import { Routes } from 'discord-api-types/v9';
import {CLIENT_ID, DISCORD_BOT_TOKEN} from './constants';
import { REST } from '@discordjs/rest';

import { SlashCommandBuilder } from '@discordjs/builders';
import { exists, introExists, playIntro, _playHelper } from './audio';
import { GuildMember, VoiceState } from 'discord.js';
import { handlers } from './handlers';


const slashCommand = new SlashCommandBuilder()
  .setName("audiomeme")
  .setDescription("Fun audio memes")
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
    )
  );

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

  switch (interaction.options.getSubcommand()) {
    case 'record':
      await handlers.recordHandler(name, interaction, guildMember);
      break;
    case 'play':
      await handlers.playHandler(name, interaction, guildMember);
      break;
    case 'random':
      await handlers.randomHandler(interaction, guildMember);
      break;
    case 'delete':
      await handlers.deleteHandler(name, interaction);
      break;
    case 'setintro':
      await handlers.setIntroHandler(name, interaction);
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
    await rest.put(
      Routes.applicationCommands(CLIENT_ID), {body: slashCommand}
    );
    console.log(`Successfully registered /${slashCommand.name} commands.`);
  } catch (error) {
    console.error(error);
  }
})();

// intros
client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => {
  if (newState.member.user.bot) return;

  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;
  const userJoinedChannel = newChannelId && (newChannelId != oldChannelId);
  if (!userJoinedChannel || newState.channel.type !== 'GUILD_VOICE') return;

  const guild = newState.guild;
  const member = newState.member;
  introExists(guild, member).then(async (so) => {
    if (so) {
      await playIntro(guild, newState.channel, newState.member);
    }
  });
});

// log when bot is ready
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(DISCORD_BOT_TOKEN);
