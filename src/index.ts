import fs from 'fs'
import _ from 'lodash'
import { executeScrape } from './functions/executeScrape'

const main: Function = async (): Promise<void> => {
  try {
    console.log(`checking if timestamp file is readable`)
    fs.accessSync(`./next_execution_timestamp`)
  } catch (e: unknown) {
    console.log(`scraping from main function after catch`)
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
  console.log(`running main function`)
  console.log(e)
  throw new Error(e.toString())
})
