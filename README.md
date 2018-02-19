# SCEPTER-StripeConnectService

[![scepter-logo](http://res.cloudinary.com/source-4-society/image/upload/v1514622047/scepter_hzpcqt.png)](https://github.com/source4societyorg/SCEPTER-core)

[![js-standard-style](https://cdn.rawgit.com/standard/standard/master/badge.svg)](http://standardjs.com)

[![Build Status](https://travis-ci.org/source4societyorg/SCEPTER-StripeConnectService.svg?branch=master)](https://travis-ci.org/source4societyorg/SCEPTER-StripeConnectService)

[![codecov](https://codecov.io/gh/source4societyorg/SCEPTER-StripeConnectService/branch/master/graph/badge.svg)](https://codecov.io/gh/source4societyorg/SCEPTER-StripeConnectService)

[![Serverless](http://public.serverless.com/badges/v1.svg)](http://serverless.com)

## Installation

We recommend forking this repository.

If you are using the [SCEPTER](https://www.github.com/source4societyorg/SCEPTER-core) framework you can install this service using the `service:add` scepter command [SCEPTER-command-service](https://github.com/source4societyorg/SCEPTER-command-service)

This will clone the service into your services folder as a submodule.

Alternatively if you are running this as a standalone service, you can simply `git clone` this repository or it's fork, and setup the configuration files locally.

## Configuration

A DynamoDB table must be created to hold Stripe Connect data. Incorporate the following to the appropriate location in your `credentials.json` file (substituting your stripe accounts values where appropriate):

    {
      "environments": {
        "yourdevenvironment": {
          "stripeSecret":"yourstripetestsecretkey"
        },
        "yourproductionenvironment": {
          "stripeSecret":"yourstripelivesecretkey
        }
      } 
    }

Also add the following into your `parameters.json` file:

    {
      "stripeOAuthApi":"https://connect.stripe.com/oauth/token"
      "environments": {
        "yourenvironment": {
          "stripeTable": "yourdynamodbtablename"
        }
    }

## Deployment

See [Serverless.com](https://www.serverles.com) and [SCEPTER-command-service](https://github.com/source4societyorg/SCEPTER-command-service) for information on how to deploy services to various cloud providers without having to modify configuration files. 

## Example

### authenticateUser

Use this function to get stripe account data back from an OAuth code. See [Stripe Connect OAuth Reference](https://stripe.com/docs/connect/oauth-reference) to understand how the workflow works. You will need to post a payload containing the code received from the OAuth redirect similar to the following:

    {
      "code": "ac_yourcodehere"
    }

The service will record the resulting stripe account data into the stripe table if successful and return a response similar to the following (so that you can associate it with your users account),

    {
      "status": true,
      "result": {
        "stripe_user_id": "acct_someuserid",
        "stripe_publishable_key": "pk_environment_somekey"
      } 
    }

### detachStripeAccount

This will delete the record that matched the passed in stripe_user_id from the stripe table. This should not be made accessible via the gateway, rather it should be called directly from another service that has already authenticated the user so that permissions can be validated. The payload is as follows:

    {
      "stripe_user_id": "yourstripeuserid"
    }
    

## Tests

To run tests and eslint, run `yarn test`.

Before running tests, you need to be sure that you have a `test` environment credential configuration set created. These are provided by default in the test folder and are automaticaly referenced by the test library,