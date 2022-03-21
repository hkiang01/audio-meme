// see https://github.com/discordjs/discord.js/blob/72577c4bfd02524a27afb6ff4aebba9301a690d3/packages/voice/examples/recorder/src/createListeningStream.ts
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, EndBehaviorType } from '@discordjs/voice';
import { Guild, User, VoiceBasedChannel } from 'discord.js';
import { Transform, TransformOptions } from 'stream';
import { OpusEncoder } from '@discordjs/opus';
import { pipeline } from 'node:stream';
import { FileWriter } from 'wav';
import { joinVoiceChannel } from '@discordjs/voice';
import fs from 'fs';
import glob from 'glob';
import path from 'path';

class OpusDecodingStream extends Transform {
  encoder: OpusEncoder
  
  constructor(options: TransformOptions, encoder: OpusEncoder) {
      super(options)
      this.encoder = encoder
  }
  
  _transform(data: Buffer, encoding, callback: () => void) {
      this.push(this.encoder.decode(data))
      callback()
  }
}

export async function pickRandom(guild: Guild): Promise<[string, Error]> {
  return new Promise<[string,Error]>((resolve) => {
    glob(`./recordings/${guild.id}/*.wav`, (err: Error, files: string[]) => {
      if (err) {
        resolve([undefined, err])
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
  const filename = `${guildDir}/${name}.wav`;
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
  const decodingStream = new OpusDecodingStream({}, encoder);
  const out = new FileWriter(filename, {
    channels: 1,
    sampleRate: 16000
  });

  return new Promise<NodeJS.ErrnoException>((resolve) => {
    pipeline(opusStream, decodingStream, out, (err) => {
      connection.destroy();
      resolve(err);
    });
  })
}

export async function play(guild: Guild, voiceBasedChannel: VoiceBasedChannel, name: string, file: string): Promise<Error> {
  let filename = undefined;
  if (file) filename = file;
  else if (name) filename = `./recordings/${guild.id}/${name}.wav`;
  else return new Promise((resolve) => resolve(new Error("Must specify either name or file")))

  const connection = joinVoiceChannel({
    channelId: voiceBasedChannel.id,
    guildId: guild.id,
    selfDeaf: false,
    selfMute: true,
    adapterCreator: guild.voiceAdapterCreator,
  })
  const resource = createAudioResource(filename);
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
    fs.unlink(`./recorings/${guild.id}/{name}.wav`, (err) =>
      resolve(err)
  )})
}
