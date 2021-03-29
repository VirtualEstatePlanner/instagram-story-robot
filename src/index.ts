import fs from 'fs'
import _ from 'lodash'
import { executeScrape } from './functions/executeScrape'

const main: Function = async (): Promise<void> => {
  try {
    fs.accessSync(`./next_execution_timestamp`)
  } catch (e: unknown) {
    await executeScrape(Date.now())
    return
  }
  const time1 = Date.now()
  let nextTick = fs.readFileSync(`./next_execution_timestamp`).readDoubleLE()
  const offset = time1 - Date.now()
  nextTick = nextTick + offset
  const timeRemaining = nextTick - Date.now()

  setTimeout(() => executeScrape(nextTick), timeRemaining)
}

main().catch((e: Error): void => {
  throw new Error(e.toString())
})
