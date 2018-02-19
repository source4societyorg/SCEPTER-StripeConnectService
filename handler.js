'use strict'
const utilities = require('@source4society/scepter-utility-lib')
const genericHandlerFunction = require('@source4society/scepter-handlerutilities-lib').genericHandlerFunction

module.exports.authenticateUser = (event, context, callback, injectedGenericHandler) => {
  const genericHandler = utilities.valueOrDefault(injectedGenericHandler, genericHandlerFunction)
  genericHandler(event, context, callback, (service, callbackHandler, errorHandler, successHandler, eventData) => {
    service.authenticateUser(event.code, (err, data) => callbackHandler(err, data, errorHandler, successHandler))
  })
}

module.exports.detachStripeAccount = (event, context, callback, injectedGenericHandler) => {
  const genericHandler = utilities.valueOrDefault(injectedGenericHandler, genericHandlerFunction)
  genericHandler(event, context, callback, (service, callbackHandler, errorHandler, successHandler, eventData) => {
    service.detachStripeAccount(event.stripe_user_id, (err, data) => callbackHandler(err, data, errorHandler, successHandler))
  })
}
