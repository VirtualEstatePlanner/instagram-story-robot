import fs from 'fs'
import toml from 'toml'
import { IScraperConfig } from './interfaces/IScraperConfig'

let blankConfig: IScraperConfig = {
  Instagram: ``,
  FolderFormat: 1,
  TimestampFile: {},
  Targets: {},
  BaseFolder: ``,
}

const tomlConfigPath = fs.readFileSync(process.env.CONFIG_PATH || 'config.toml').toString()
blankConfig = toml.parse(tomlConfigPath)

export const Config: IScraperConfig = { ...blankConfig }
