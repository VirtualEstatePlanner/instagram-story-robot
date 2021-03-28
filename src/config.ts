import fs from 'fs'
import toml from 'toml'
import winston from 'winston'
import { IScraperConfig } from './interfaces/IScraperConfig'

export let Config: IScraperConfig = {
  Instagram: ``,
  FolderFormat: 1,
  TimestampFile: {},
  Targets: {},
  BaseFolder: ``,
}

{
  const fp = fs.readFileSync(process.env.CONFIG_PATH || 'config.toml').toString()
  Config = toml.parse(fp)
}

{
  // noinspection JSCheckFunctionSignatures
  const con = new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize({ level: true }), winston.format.prettyPrint(), winston.format.simple()),
    level: 'info',
  })

  const lineFmt = winston.format.combine(winston.format.timestamp(), winston.format.json())

  winston.configure({
    level: 'debug',
    format: lineFmt,
    defaultMeta: { service: 'isr' },
    transports: [
      con,
      new winston.transports.File({
        filename: 'data/debug.log',
        level: 'debug',
      }),
      new winston.transports.File({
        filename: 'data/error.log',
        level: 'error',
      }),
    ],
  })
}
