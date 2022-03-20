// see https://github.com/discordjs/discord.js/blob/72577c4bfd02524a27afb6ff4aebba9301a690d3/packages/voice/examples/recorder/src/createListeningStream.ts
import { EndBehaviorType, VoiceConnection } from '@discordjs/voice';
import { CommandInteraction } from 'discord.js';
import { Transform } from 'stream';
const { OpusEncoder} = require('@discordjs/opus');
import { pipeline } from 'node:stream';
import { FileWriter } from 'wav';

class OpusDecodingStream extends Transform {
  encoder
  
  constructor(options, encoder) {
      super(options)
      this.encoder = encoder
  }
  
  _transform(data, encoding, callback) {
      this.push(this.encoder.decode(data))
      callback()
  }
}

export function record(interaction: CommandInteraction, connection: VoiceConnection) {
  const user = interaction.user;

  // see https://github.com/discordjs/voice/issues/209#issuecomment-930288577
  // see https://github.com/Yvtq8K3n/BobbyMcLovin/blob/742d041f5d3bd621628681c9ded0d7acde096c24/index.js#L42
  // A Readable object mode stream of Opus packets
  // Will only end when the voice connection is destroyed
  const filename = `./recordings/${Date.now()}-${user.username}-${user.discriminator}.wav`;
  const encoder = new OpusEncoder(16000, 1)

  const opusStream = connection.receiver.subscribe(user.id, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 1000
    }
  });
  const decodingSTream = new OpusDecodingStream({}, encoder);

  const out = new FileWriter(filename, {
    channels: 1,
    sampleRate: 16000
  });

	pipeline(opusStream, decodingSTream, out, (err) => {
		if (err) {
			console.warn(`❌ Error recording file ${filename} - ${err.message}`);
		} else {
			console.log(`✅ Recorded ${filename}`);
		}
	});
}
