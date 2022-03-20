// see https://github.com/discordjs/discord.js/blob/72577c4bfd02524a27afb6ff4aebba9301a690d3/packages/voice/examples/recorder/src/createListeningStream.ts
import { EndBehaviorType, VoiceConnection } from '@discordjs/voice';
import { CommandInteraction } from 'discord.js';
import { createWriteStream } from 'node:fs';
import { OggLogicalBitstream, OpusHead } from 'prism-media/dist/opus';
import { pipeline } from 'node:stream';

export function record(interaction: CommandInteraction, connection: VoiceConnection, duration: number) {
  const user = interaction.user;
  const opusStream = connection.receiver.subscribe(user.id, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 100
    }
  })
  const oggStream = new OggLogicalBitstream({
    opusHead: new OpusHead({
      channelCount: 2,
      sampleRate: 48000
    }),
    pageSizeControl: {
      maxPackets: 10
    }
  })

  const filename = `./recordings/${Date.now()}-${user.username}-${user.discriminator}.ogg`;
  const out = createWriteStream(filename);
  console.log(`👂 Started recording ${filename}`);

	pipeline(opusStream, oggStream, out, (err) => {
		if (err) {
			console.warn(`❌ Error recording file ${filename} - ${err.message}`);
		} else {
			console.log(`✅ Recorded ${filename}`);
		}
	});
}
