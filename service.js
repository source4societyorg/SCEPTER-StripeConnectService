'use strict'
const utilities = require('@source4society/scepter-utility-lib')
const serviceUtilities = require('@source4society/scepter-service-utility-lib')
const DynamoDBLib = require('@source4society/scepter-dynamodb-lib')
const fromJS = require('immutable').fromJS
const requestLib = require('request')

class Service {
  constructor (
    injectedStage,
    injectedCredentialsPath,
    injectedServicesPath,
    injectedParametersPath,
    injectedStripeOAuthApi,
    injectedStripeSecret,
    injectedStripeTable,
    injectedDynamoDB,
    injectedRequest
  ) {
    const stage = utilities.valueOrDefault(injectedStage, process.env.STAGE)
    const credentialsPath = utilities.valueOrDefault(injectedCredentialsPath, './credentials')
    const servicesPath = utilities.valueOrDefault(injectedServicesPath, './services')
    const parametersPath = utilities.valueOrDefault(injectedParametersPath, './parameters')
    const request = utilities.valueOrDefault(injectedRequest, requestLib)
    const DynamoDB = utilities.valueOrDefault(injectedDynamoDB, DynamoDBLib)
    this.environment = stage
    this.credentials = fromJS(require(credentialsPath))
    this.services = fromJS(require(servicesPath))
    this.parameters = fromJS(require(parametersPath))
    this.stripeOAuthApi = utilities.valueOrDefault(injectedStripeOAuthApi, this.parameters.get('stripeOAuthApi'))
    this.stripeSecret = utilities.valueOrDefault(injectedStripeSecret, this.credentials.getIn(['environments', stage, 'stripeSecret']))
    const stripeTable = utilities.valueOrDefault(injectedStripeTable, this.parameters.getIn(['environments', stage, 'stripeTable']))
    this.request = request
    this.dynamoDB = new DynamoDB()
    this.dynamoDB.setConfiguration(this.credentials, this.environment)
    this.stripeTable = stripeTable
  }

  authenticateUser (code, callback, injectedInitiateHandledSequence) {
    const initiateHandledSequence = utilities.valueOrDefault(injectedInitiateHandledSequence, serviceUtilities.initiateHandledSequence)
    initiateHandledSequence((finalCallback, sequenceCallback) => this.authenticateUserSequence(finalCallback, sequenceCallback, code), callback)
  }

  detachStripeAccount (stripeUserId, callback, injectedInitiateHandledSequence) {
    const initiateHandledSequence = utilities.valueOrDefault(injectedInitiateHandledSequence, serviceUtilities.initiateHandledSequence)
    initiateHandledSequence((finalCallback, sequenceCallback) => this.detachStripeAccountSequence(finalCallback, sequenceCallback, stripeUserId), callback)
  }

  * authenticateUserSequence (finalCallback, sequenceCallback, code, injectedRequest, injectStripeOAuthApi, injectedStripeSecret, injectedStripeTable, injectedDynamoDB) {
    this.validateCode(code)
    const request = utilities.valueOrDefault(injectedRequest, this.request)
    const stripeOAuthApi = utilities.valueOrDefault(injectStripeOAuthApi, this.stripeOAuthApi)
    const stripeSecret = utilities.valueOrDefault(injectedStripeSecret, this.stripeSecret)
    const stripeTable = utilities.valueOrDefault(injectedStripeTable, this.stripeTable)
    const dynamoDB = utilities.valueOrDefault(injectedDynamoDB, this.dynamoDB)
    const wwwFormEncodedParams = `client_secret=${stripeSecret}&code=${code}&grant_type=authorization_code`
    const stripeAuthResponse = yield request(
      {
        url: stripeOAuthApi,
        method: 'POST',
        headers: [{ 'Content-Type': 'application/x-www-form-urlencoded' }],
        body: wwwFormEncodedParams
      },
      (error, response, body) => sequenceCallback(error, body)
    )
    const processedAuthResponse = this.processAuthResponse(stripeAuthResponse)
    this.validateAuthResponse(processedAuthResponse)
    yield dynamoDB.putItem(stripeTable, processedAuthResponse, sequenceCallback, { ConditionExpression: 'attribute_not_exists(stripe_user_id)' })
    const responseData = {
      stripe_user_id: processedAuthResponse.stripe_user_id,
      stripe_publishable_key: processedAuthResponse.stripe_publishable_key
    }

    finalCallback(null, responseData)
  }

  * detachStripeAccountSequence (finalCallback, sequenceCallback, stripeUserId, injectedStripeTable, injectedDynamoDB) {
    this.validateStripeUserId(stripeUserId)
    const stripeTable = utilities.valueOrDefault(injectedStripeTable, this.stripeTable)
    const dynamoDB = utilities.valueOrDefault(injectedDynamoDB, this.dynamoDB)
    const deleteResult = yield dynamoDB.deleteItem(stripeTable, { stripe_user_id: stripeUserId, recordType: 'stripe-data' }, sequenceCallback)
    finalCallback(null, deleteResult)
  }

  validateStripeUserId (stripeUserId) {
    if (utilities.isEmpty(stripeUserId)) {
      throw new Error('stripe_user_id is required')
    }
  }

  processAuthResponse (stripeAuthResponse) {
    let modifiedAuthResponse = stripeAuthResponse
    if (typeof stripeAuthResponse === 'string') {
      modifiedAuthResponse = JSON.parse(stripeAuthResponse)
    }
    modifiedAuthResponse.recordType = 'stripe-data'
    return modifiedAuthResponse
  }

  validateAuthResponse (stripeAuthResponse) {
    if (utilities.notEmptyAt(stripeAuthResponse, ['error_description'])) {
      throw new Error(stripeAuthResponse.error_description)
    }

    if (utilities.isEmpty(stripeAuthResponse.stripe_user_id)) {
      throw new Error('Unexpected error')
    }
  }

  validateCode (code) {
    if (utilities.isEmpty(code)) {
      throw new Error('Invalid authentication code')
    }
  }

  prepareErrorResponse (error) {
    return {
      status: false,
      error: utilities.valueOrDefault(error.message, error)
    }
  }

  prepareSuccessResponse (data) {
    return {
      status: true,
      result: data
    }
  }
}

module.exports = Service
