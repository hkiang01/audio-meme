// see https://github.com/discordjs/discord.js/blob/72577c4bfd02524a27afb6ff4aebba9301a690d3/packages/voice/examples/recorder/src/createListeningStream.ts
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, EndBehaviorType } from '@discordjs/voice';
import { Guild, User, VoiceBasedChannel } from 'discord.js';
import { OpusEncoder } from '@discordjs/opus';
import { pipeline } from 'node:stream';
import { createWriteStream } from 'node:fs';
import { joinVoiceChannel } from '@discordjs/voice';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import {opus} from 'prism-media';

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

export async function record(guild: Guild, voiceBasedChannel: VoiceBasedChannel, user: User, name: string): Promise<NodeJS.ErrnoException> {
  // see https://github.com/discordjs/voice/issues/209#issuecomment-930288577
  // see https://github.com/Yvtq8K3n/BobbyMcLovin/blob/742d041f5d3bd621628681c9ded0d7acde096c24/index.js#L42
  // A Readable object mode stream of Opus packets
  // Will only end when the voice connection is destroyed
  const guildDir = `./recordings/${guild.id}`;
  if (!fs.existsSync(guildDir)){
    fs.mkdirSync(guildDir);
  }
  const filename = `${guildDir}/${name}.ogg`;
  const encoder = new OpusEncoder(16000, 1)

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

export async function exists(guild: Guild, name: string): Promise<boolean> {
  const path = `./recordings/${guild.id}/${name}.ogg`;
  return new Promise((resolve) => {
    fs.access(path, fs.constants.F_OK, (err) => {
      resolve(!err)
    })
  })
}

export async function play(guild: Guild, voiceBasedChannel: VoiceBasedChannel, name: string): Promise<Error> {
  const path = `./recordings/${guild.id}/${name}.ogg`;

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
      connection.destroy();
      resolve(undefined);
    });
  })
}

export async function deleteMeme(guild: Guild, name: string): Promise<Error> {
  return new Promise((resolve) => {
    fs.unlink(`./recordings/${guild.id}/${name}.ogg`, (err) =>
      resolve(err)
  )})
}
