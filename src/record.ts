// see https://github.com/discordjs/discord.js/blob/72577c4bfd02524a27afb6ff4aebba9301a690d3/packages/voice/examples/recorder/src/createListeningStream.ts
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, EndBehaviorType } from '@discordjs/voice';
import { CommandInteraction, Guild, User, VoiceBasedChannel } from 'discord.js';
import { Transform, TransformOptions } from 'stream';
import { OpusEncoder } from '@discordjs/opus';
import { pipeline } from 'node:stream';
import { FileWriter } from 'wav';
import { joinVoiceChannel } from '@discordjs/voice';
import fs from 'fs';


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

export async function record(guild: Guild, voiceBasedChannel: VoiceBasedChannel, user: User, name: string) {
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

export async function play(guild: Guild, voiceBasedChannel: VoiceBasedChannel, name: string) {
  const filename = `./recordings/${guild.id}/${name}.wav`;
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
  return new Promise<void>((resolve) => {
    player.on(AudioPlayerStatus.Idle, async () => {
      connection.destroy();
      resolve();
    });
  })
}
