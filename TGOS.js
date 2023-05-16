const axios = require('axios');
const qs = require('qs');

const MAX_RETRIES = 2;

module.exports = class TGOS {
  constructor({
    apiUrl = 'https://addr.tgos.tw/addrws/v40/QueryAddr.asmx/QueryAddr',
    appId = '',
    appKey = '',
    debug,
  }) {
    this.apiUrl = apiUrl;
    this.oAPPId = appId;
    this.oAPIKey = appKey;
    this.debug = debug;
  }

  log(...data) {
    if (this.debug) {
      console.log(...data); // eslint-disable-line no-console
    }
  }

  xmlParser(xmlString = '') {
    const regex = new RegExp(/<string[^>]*>(.*?)<\/string>/gs);
    const dataString = xmlString
      .match(regex)[0]
      .replace(/<\/?string[^>]*>/g, '')
      .replace(/	/g, '');

    return JSON.parse(dataString);
  }

  async request(payload, inRetries = 0) {
    try {
      this.log(payload);

      const { data } = await axios(payload);
      this.log(data);

      const jsonObj = this.xmlParser(data);

      return jsonObj;
    } catch (e) {
      // this.log(e);

      if (e.response && e.response.status === 403 && inRetries < MAX_RETRIES) {
        this.log('Retry for 403');
        return this.request(payload, inRetries + 1);
      }

      if (e.response && e.response.data) {
        throw new Error(e.response.data);
      }

      if (e.toJSON) {
        throw new Error(e.toJSON().message);
      }

      throw new Error(e);
    }
  }

  async queryAddress(oAddress = '', config = {}) {
    const {
      oAPPId,
      oAPIKey,
    } = this;

    const options = {
      method: 'GET',
      url: this.apiUrl + '?' + qs.stringify({
        oAPPId,
        oAPIKey,
        oAddress,
        ...Object.assign({
          oSRS: 'EPSG:4326',
          oFuzzyType: 2,
          oResultDataType: 'JSON',
          oFuzzyBuffer: 0,
          oIsOnlyFullMatch: false,
          oIsSupportPast: true,
          oIsShowCodeBase: false,
          oIsLockCounty: true,
          oIsLockTown: false,
          oIsLockVillage: false,
          oIsLockRoadSection: false,
          oIsLockLane: false,
          oIsLockAlley: false,
          oIsLockArea: false,
          oIsSameNumber_SubNumber: true,
          oCanIgnoreVillage: true,
          oCanIgnoreNeighborhood: true,
          oReturnMaxCount: 1,
        }, config, {
          oResultDataType: 'JSON', // lock this field
        }),
      }),
      headers: {},
    };

    return this.request(options);
  }
};
