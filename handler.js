'use strict';
const settings = require('./config/settings')
const axios = require('axios')
const cheerio = require('cheerio')

const uuid = require('uuid')
class Handler {
  constructor({dynamoDB, tableName, commitUrl}){
    this.dynamoDB = dynamoDB
    this.tableName = tableName
    this.commitUrl = commitUrl
  }
  async getCommitMessage(){
    const { data } = await axios.get(this.commitUrl)
    const $ = cheerio.load(data)
    const [commitMessage] = $("#content").text().trim().split('\n')
    console.log(commitMessage)
    return commitMessage
  }
  prepareData(commitMessage){
    return {
      TableName: this.tableName,
      Item: {
        commitMessage,
        id: uuid.v1(),
        createdAt: new Date().toISOString()
      }
    }
  }
  async saveData(params){
    await this.dynamoDB.put(params).promise()
  }
  makeResponse(statusCode = 200){
    return { statusCode  }
  }
  async main(event){
    try{   
      console.log('at', new Date().toISOString(), JSON.stringify(event,null,2))
      const commit = await this.getCommitMessage()
      const data = this.prepareData(commit)
      await this.saveData(data)
      console.log('finished at', new Date().toISOString())
      this.makeResponse()
    }catch(error){
      console.log(error.message, error.stack)
      this.makeResponse(500)
    }
  
  }
}
const AWS = require('aws-sdk')
const dynamoDB = new AWS.DynamoDB.DocumentClient()
const handler = new Handler({ 
  dynamoDB, 
  tableName: settings.DbTableName,
  commitUrl: settings.APICommitMessagesURL
})
module.exports.scheduler = handler.main.bind(handler)