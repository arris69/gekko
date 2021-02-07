const _ = require('lodash');
const fs = require('fs');
const request = require('request-promise');
const Promise = require('bluebird');


// truly depends on market: https://www.binance.com/en/trade-rule ->  
let getOrderMinSize = currency => {
  if (currency === 'BTC') return 0.0001;
  else if (currency === 'ETH') return 0.01;
  else if (currency === 'BNB') return 0.1;
  else if (currency === 'TRX' || currency === 'RUB') return 100;
  else if (currency === 'NGN') return 500;  
  else if (currency === 'BIDRT' || currency === 'IDRT') return 20000;
  else return 10;
};

// https://binance-docs.github.io/apidocs/spot/en/#exchange-information
const options = {
  url: 'https://api.binance.com/api/v3/exchangeInfo',
  headers: {
    Connection: 'keep-alive',
    'User-Agent': 'Request-Promise',
  },
  json: true,
};

request(options)
  .then(body => {
    if (!body && !body.data) {
      throw new Error('Unable to fetch product list, response was empty');
    }

    let assets = _.uniqBy(_.map(body.symbols, market => market.baseAsset));
    let currencies = _.uniqBy(_.map(body.symbols, market => market.quoteAsset));
    let pairs = _.map(body.symbols, market => {
      return {
        pair: [market.quoteAsset, market.baseAsset],
        minimalOrder: {
          /* old api? pre 2021
           * amount: parseFloat(market.minTrade), 
           * price: parseFloat(market.tickSize), 
           */
          amount: parseFloat(_.mapValues(market.filters, 'minQty')[2]),
          price: parseFloat(_.mapValues(market.filters, 'tickSize')[0]), 
          order: getOrderMinSize(market.quoteAsset),
                    // for debug ->  data: { filter: _.map(market.filters,filter => filter),},
        },
      };
    });

    return { assets: assets, currencies: currencies, markets: pairs };
  })
  .then(markets => {
    fs.writeFileSync('../../wrappers/binance-markets.json', JSON.stringify(markets, null, 2));
    console.log(`Done writing Binance market data`);
  })
  .catch(err => {
    console.log(`Couldn't import products from Binance`);
    console.log(err);
  });
