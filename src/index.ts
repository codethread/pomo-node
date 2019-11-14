require('dotenv').config();
import { flags as f } from '@oclif/command';
import {Command} from '@oclif/command'
import execa from 'execa';
import os from 'os';
import alert from 'node-notifier';

const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

class Pomo extends Command {
  static description = 'start a pomodoro timer';

  static flags = {
    complete: f.boolean({ char: 'c' }),
  };

  private execaOptions: execa.Options = { cwd: os.homedir() };
  private pomoLength = 25;

  async run() {
    const { flags } = this.parse(Pomo);

    if (flags.complete) {
      await this.end();
      this.exit(0);
    }

    this.log('starting new pomo timer');

    let timer:any;
    let mins = this.pomoLength;

    await this.slackStatus(`free in ${mins} mins`, ':tomato:');
    await this.slackPresence('away');
    await this.slackSnooze(mins);

    timer = setInterval(async () => {
      mins--
      this.log('timer: ', mins)
      if (mins < 1) {
        await this.end();
        clearInterval(timer)
      } else {
        await this.slackStatus(`free in ${mins} mins`, ':tomato:');
      }
    }, 60000);
  }

  async slackStatus(message: string, emoji: string) {
    const slack = process.env.SLACK
    await this.shell(
      `SLACK_CLI_TOKEN=${slack} slack status edit --text "${message}" --emoji '${emoji}'`,
      false,
      { shell: true },
    );
  }

  async slackPresence(active: 'active' | 'away') {
    const slack = process.env.SLACK
    await this.shell(
      `SLACK_CLI_TOKEN=${slack} slack presence ${active}`,
      false,
      { shell: true },
    );
  }

  async slackSnooze(mins: number) {
    const slack = process.env.SLACK
    await this.shell(
      mins === 0
        ? `SLACK_CLI_TOKEN=${slack} slack snooze end`
        : `SLACK_CLI_TOKEN=${slack} slack snooze start --minutes ${mins}`,
      false,
      { shell: true },
    );
  }

  async end() {
    this.log('stopping')

    alert.notify('Timer Done!');
    await this.shell(`afplay /System/Library/Sounds/Glass.aiff`)
    await this.slackStatus('free', ':pickle_rick:');
    await this.slackPresence('active');
    await this.slackSnooze(0);
  }

  async shell(cmd: string, pipeOutput = true, optionOverides?: execa.Options) {
    const currentOptions = { ...this.execaOptions };

    const options = {
      ...currentOptions,
      ...optionOverides,
    };

    const subprocess = execa.command(cmd, options);
    if (pipeOutput) {
      subprocess.stdout.pipe(process.stdout);
    }
    const res = await subprocess;
    return res;
  }
}

export = Pomo
