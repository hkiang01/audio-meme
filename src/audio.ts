import { AudioPlayerStatus, createAudioPlayer, createAudioResource, EndBehaviorType, VoiceConnectionStatus} from '@discordjs/voice';
import { Guild, GuildMember, User, VoiceBasedChannel } from 'discord.js';
import { pipeline } from 'node:stream';
import { createWriteStream } from 'node:fs';
import { joinVoiceChannel } from '@discordjs/voice';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import {opus} from 'prism-media';
import ytdl from 'ytdl-core';

export async function pickRandom(guild: Guild): Promise<[string, Error]> {
  return new Promise<[string,Error]>((resolve) => {
    glob(`./recordings/${guild.id}/*.ogg`, (err: Error, files: string[]) => {
      if (err) {
        resolve([undefined, err]);
        return;
      }
      if (files.length == 0) {
        resolve([undefined, new Error("No memes found")]);
        return;
      }
      const randIdx = Math.floor(Math.random() * files.length);
      const randFilePath = files[randIdx];
      // ./recordings/123456789/name.wav -> name
      const randName = path.basename(randFilePath).slice(0,-4);
      resolve([randName, undefined])
    })
  })
}

// see https://github.com/discordjs/discord.js/blob/72577c4bfd02524a27afb6ff4aebba9301a690d3/packages/voice/examples/recorder/src/createListeningStream.ts
export async function record(guild: Guild, voiceBasedChannel: VoiceBasedChannel, user: User, name: string): Promise<NodeJS.ErrnoException> {
  const guildDir = `./recordings/${guild.id}`;
  if (!fs.existsSync(guildDir)){
    fs.mkdirSync(guildDir);
  }
  const filename = `${guildDir}/${name}.ogg`;

  const connection = joinVoiceChannel({
    channelId: voiceBasedChannel.id,
    guildId: guild.id,
    selfDeaf: false,
    selfMute: true,
    adapterCreator: guild.voiceAdapterCreator,
  })
  const opusStream = connection.receiver.subscribe(user.id, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 1000
    }
  });
  const oggStream = new opus.OggLogicalBitstream({
		opusHead: new opus.OpusHead({
			channelCount: 2,
			sampleRate: 48000,
		}),
		pageSizeControl: {
			maxPackets: 10,
		},
	});

  const out = createWriteStream(filename);

  return new Promise<NodeJS.ErrnoException>((resolve) => {
    pipeline(opusStream, oggStream, out, (err) => {
      connection.destroy();
      resolve(err);
    });
  })
}
// /audiomeme record name:gyro youtubeurl:http://www.youtube.com/watch?v=ImbSSTvRtPw
export async function recordYoutube(guild: Guild, name: string, youtubeUrl: string): Promise<Error> {
  const guildDir = `./recordings/${guild.id}`;

  if (!fs.existsSync(guildDir)){
    fs.mkdirSync(guildDir);
  }
  const filename = `${guildDir}/${name}.ogg`;
  return new Promise<Error>((resolve) => {
    ytdl(youtubeUrl, {filter: 'audioonly'})
    .pipe(createWriteStream(filename))
    .on('finish', () => resolve(undefined))
    .on('error', (err) => resolve(err))
  })
}

export async function exists(guild: Guild, name: string): Promise<boolean> {
  const path = `./recordings/${guild.id}/${name}.ogg`;
  return new Promise((resolve) => {
    fs.access(path, fs.constants.F_OK, (err) => {
      resolve(!err)
    })
  })
}

export async function introExists(guild: Guild, member: GuildMember) {
  const path = `./intros/${guild.id}/${member.user.id}.ogg`;
  return new Promise((resolve) => {
    fs.access(path, fs.constants.F_OK, (err) => {
      resolve(!err)
    })
  })
}

export function _playHelper(guild: Guild, voiceBasedChannel: VoiceBasedChannel, path: string): Promise<Error> {
  const connection = joinVoiceChannel({
    channelId: voiceBasedChannel.id,
    guildId: guild.id,
    selfDeaf: false,
    selfMute: true,
    adapterCreator: guild.voiceAdapterCreator,
  })
  const resource = createAudioResource(path);
  const player = createAudioPlayer();
  player.play(resource);
  connection.subscribe(player);
  return new Promise<Error>((resolve) => {
    player.on(AudioPlayerStatus.Idle, async () => {
      if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.destroy();
      }
      resolve(undefined);
    });
  })
}

export async function play(guild: Guild, voiceBasedChannel: VoiceBasedChannel, name: string): Promise<Error> {
  const path = `./recordings/${guild.id}/${name}.ogg`;
  return _playHelper(guild, voiceBasedChannel, path);
}

export async function playIntro(guild: Guild, voiceBasedChannel: VoiceBasedChannel, member: GuildMember, skipDelay?: boolean): Promise<Error> {
  const path = `./intros/${guild.id}/${member.user.id}.ogg`;

  if (!skipDelay) {
    return new Promise<Error>((resolve) => {
      setTimeout(async () => {
        const err = await _playHelper(guild, voiceBasedChannel, path);
        resolve(err);
      }, 250);
    })
  } else {
    return _playHelper(guild, voiceBasedChannel, path);
  }

}

export async function deleteMeme(guild: Guild, name: string): Promise<Error> {
  return new Promise((resolve) => {
    fs.unlink(`./recordings/${guild.id}/${name}.ogg`, (err) =>
      resolve(err)
  )})
}
