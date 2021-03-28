import fs from 'fs'
import toml from 'toml'
import { IgApiClient } from 'instagram-private-api'
import { IScraperConfig } from '../interfaces/IScraperConfig'
const tomlConfig: string = fs.readFileSync(`./config.toml`).toString()
const runtimeConfig: IScraperConfig = toml.parse(tomlConfig)

let igClientSetup: IgApiClient = new IgApiClient()
igClientSetup.simulate.preLoginFlow()
igClientSetup.state.generateDevice(runtimeConfig.Instagram.Username)
igClientSetup.account.login(runtimeConfig.Instagram.Username, runtimeConfig.Instagram.Password)

export const instagramClient: IgApiClient = igClientSetup
