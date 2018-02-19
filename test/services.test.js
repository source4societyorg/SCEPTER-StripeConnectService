const credentialsTest = require('./credentials-test.json')
const parametersTest = require('./parameters-test.json')
const servicesTest = require('./services-test.json')
const serviceUtilities = require('@source4society/scepter-service-utility-lib')
const fromJS = require('immutable').fromJS
const Service = require('../service')
test('service constructor defines properties', () => {
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  expect(service.environment).toEqual('test')
  expect(service.credentials).toEqual(fromJS(credentialsTest))
  expect(service.parameters).toEqual(fromJS(parametersTest))
  expect(service.services).toEqual(fromJS(servicesTest))
})

test('prepareErrorResponse returns the error output of the service', () => {
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  const mockError = new Error('test error')
  const expectedResponse = {'error': mockError.message, 'status': false}
  expect(service.prepareErrorResponse(mockError)).toEqual(expectedResponse)
})

test('prepareSuccessResponse returns data', () => {
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  const expectedResponse = {'result': 'Hello', 'status': true}
  expect(service.prepareSuccessResponse('Hello')).toEqual(expectedResponse)
})

test('authenticateUser initiates sequence', (done) => {
  const mockCode = 'mockcode'
  const mockResponseData = { hasProperties: 'mockresponsedata' }
  const mockCallback = (err, data) => {
    expect(err).toBeNull()
    expect(data).toEqual(mockResponseData)
    done()
  }
  function * mockAuthenticateUserSequence (finalCallback, sequenceCallback, code) {
    expect(code).toEqual(code)
    let result = yield setTimeout(() => sequenceCallback(null, mockResponseData), 10)
    finalCallback(null, result)
  }
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  service.authenticateUserSequence = mockAuthenticateUserSequence
  service.authenticateUser(mockCode, mockCallback)
})

test('authenticateUserSequence first makes a request to stripe, stores the result and creates a modified response', (done) => {
  const mockCode = 'mockCode'
  const mockStripeOAuthApi = 'mockStripeOAuthApi'
  const mockStripeSecret = 'mockStripeSecret'
  const mockStripeTable = 'mockStripeTable'
  const mockRequestBody = `client_secret=${mockStripeSecret}&code=${mockCode}&grant_type=authorization_code`
  const mockResponseData = { hasProperties: 'mockResponseData' }
  const mockStripeUserId = 'mockStripeUserId'
  const mockStripePublishableKey = 'mockStripePublishableKey'
  const mockProcessedResponseData = { stripe_user_id: mockStripeUserId, stripe_publishable_key: mockStripePublishableKey }
  const mockFinalResponse = {
    stripe_user_id: mockStripeUserId,
    stripe_publishable_key: mockStripePublishableKey
  }
  const mockRequest = (parameters, callback) => {
    expect(parameters).toEqual({
      url: mockStripeOAuthApi,
      method: 'POST',
      headers: [{ 'Content-Type': 'application/x-www-form-urlencoded' }],
      body: mockRequestBody
    })
    setTimeout(() => callback(null, null, mockResponseData), 10)
  }
  const mockDynamoDB = {
    putItem: (table, authResponse, sequenceCallback, options) => {
      expect(table).toEqual(mockStripeTable)
      expect(authResponse).toEqual(mockProcessedResponseData)
      expect(options).toEqual({
        ConditionExpression: 'attribute_not_exists(stripe_user_id)'
      })
      setTimeout(() => sequenceCallback(null, mockResponseData), 10)
    }
  }
  const mockProcessAuthResponse = (authResponse) => {
    expect(authResponse).toEqual(mockResponseData)
    return mockProcessedResponseData
  }
  const mockValidateAuthResponse = (authResponse) => {
    expect(authResponse).toEqual(mockProcessedResponseData)
  }
  const mockCallback = (err, data) => {
    expect(err).toBeNull()
    expect(data).toEqual(mockFinalResponse)
    done()
  }
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  service.processAuthResponse = mockProcessAuthResponse
  service.validateAuthResponse = mockValidateAuthResponse
  serviceUtilities.initiateHandledSequence(
    (finalCallback, sequenceCallback) =>
      service.authenticateUserSequence(
        finalCallback,
        sequenceCallback,
        mockCode,
        mockRequest,
        mockStripeOAuthApi,
        mockStripeSecret,
        mockStripeTable,
        mockDynamoDB
      ),
    mockCallback
  )
})

test('processAuthResponse parses string and adds the recordType', () => {
  const mockStripeAuthResponseAsObject = { hasProperties: 'mockStripeAuthResponse' }
  const mockStripeAuthResponseAsString = JSON.stringify(mockStripeAuthResponseAsObject)
  const mockProcessedResponse = { hasProperties: 'mockStripeAuthResponse', recordType: 'stripe-data' }
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  expect(service.processAuthResponse(mockStripeAuthResponseAsString)).toEqual(mockProcessedResponse)
  expect(service.processAuthResponse(mockStripeAuthResponseAsObject)).toEqual(mockProcessedResponse)
})

test('validateAuthResponse throws error when error_description is present in response or when stripe_user_id is missing', () => {
  const mockAuthResponseWithError = { hasProperties: 'authResponseWithError', error_description: 'mockErrorMessage' }
  const mockAuthResponseNoUserId = { hasProperties: 'authResponseNoUserId' }
  const mockValidAuthResponse = { hasProperties: 'validAuthResponse', stripe_user_id: 'mockStripeUserId' }
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  expect(() => service.validateAuthResponse(mockAuthResponseWithError)).toThrow()
  expect(() => service.validateAuthResponse(mockAuthResponseNoUserId)).toThrow()
  service.validateAuthResponse(mockValidAuthResponse)
})

test('validateCode throws error if code is not passed in request payload', () => {
  const mockInvalidCode = ''
  const mockValidCode = 'mockValidCode'
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  expect(() => service.validateCode(mockInvalidCode)).toThrow()
  service.validateCode(mockValidCode)
})

test('detachStripeAccount initiates sequence', (done) => {
  const mockStripeUserId = 'mockStripeUserId'
  const mockSequenceResult = 'mockSequenceResult'
  const mockCallback = (err, data) => {
    expect(err).toBeNull()
    expect(data).toEqual(mockSequenceResult)
    done()
  }
  function * mockDetachStripeAccountSequence (finalCallback, sequenceCallback, stripeUserId) {
    expect(stripeUserId).toEqual(mockStripeUserId)
    const result = yield setTimeout(() => sequenceCallback(null, mockSequenceResult), 10)
    finalCallback(null, result)
  }
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  service.detachStripeAccountSequence = mockDetachStripeAccountSequence
  service.detachStripeAccount(mockStripeUserId, mockCallback)
})

test('detachStripeAccountSequence validates stripeUserId and then deletes the corresponding stripe record', (done) => {
  const mockStripeUserId = 'mockStripeUserId'
  const mockStripeTable = 'mockStripeTable'
  const mockDeleteResponse = true
  const mockDynamoDB = {
    deleteItem: (tableName, keyExpression, sequenceCallback) => {
      expect(tableName).toEqual(mockStripeTable)
      expect(keyExpression).toEqual({
        stripe_user_id: mockStripeUserId,
        recordType: 'stripe-data'
      })
      setTimeout(() => sequenceCallback(null, mockDeleteResponse), 10)
    }
  }
  const mockValidateStripeUserId = (stripeUserId) => {
    expect(stripeUserId).toEqual(mockStripeUserId)
  }
  const mockCallback = (err, data) => {
    expect(err).toBeNull()
    expect(data).toBeTruthy()
    done()
  }
  let service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  service.validateStripeUserId = mockValidateStripeUserId
  serviceUtilities.initiateHandledSequence(
    (finalCallback, sequenceCallback) =>
      service.detachStripeAccountSequence(
        finalCallback,
        sequenceCallback,
        mockStripeUserId,
        mockStripeTable,
        mockDynamoDB
      ),
    mockCallback
  )
})

test('validateStripeUserId throws error if user id is empty', () => {
  const mockInvalidStripeUserId = ''
  const mockValidStripeUserId = 'mockStripeUserId'
  const service = new Service('test', './test/credentials-test.json', './test/services-test.json', './test/parameters-test.json')
  expect(() => service.validateStripeUserId(mockInvalidStripeUserId)).toThrow()
  service.validateStripeUserId(mockValidStripeUserId)
})
