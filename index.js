const fs = require('fs')
const qs = require('qs')
const _axios = require('axios')
const axios = _axios.create()
const API_CONFIG = {
    client_id: '3MVG9dCCPs.KiE4Q3KI9zs8pqt1vgSwYjH0Do1nMJxI3D5FWrpCo1hMOGWF6RJZ52KN3QGuT0qGpS1ED0hN3c',
    client_secret: 'BB9036A00819448EB0218A2B0A439AC59897B5B46716B7162DD293632202593C',
    username: 'arsmith@amherst.com.jakedev',
    password: 'Fenderstrat90Ow5MpsreSlDl4MuuZvpsTSrc',
    grant_type: 'password',
}
const BASE_URL = 'https://cs18.salesforce.com'
let accessToken = '00D110000001uIK!AREAQIaKfr9TNwo5c92hE1FowF.baFxe6DoBH3rn6bQX2Y3kkSR7kpc45I08SCOgmcWV67z2AStWJp6RtTjl.vheCbq8zRxX'
const ORDERS_QUERY = 'select+Id+from+BPOOrder__c'

async function run() {
    // await getToken()

    const orderIds = await getOrderIds()
    console.log('number of orders', orderIds.length)

    await Promise.all(
        orderIds.map(orderId => createPdfForOrder(orderId))
    )
    
    console.log('created pdfs')
}

async function getToken() {
    const { data } = await axios({
        method: 'post',
        url: `${BASE_URL}/services/oauth2/token`,
        data: qs.stringify(API_CONFIG),
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
    })
    accessToken = data.access_token
}

const getOrderIds = async () => {
    const orderRecords = []
    const { data } = await axios({
        method: 'get',
        url: `${BASE_URL}/services/data/v48.0/query?q=${ORDERS_QUERY}`,
        headers: {
            'content-type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + accessToken,
        },
    })
    const { done, nextRecordsUrl, records, totalSize } = data
    orderRecords.push(...records)

    if (!done) {
        const iterations = Math.ceil(totalSize / records.length)
        let nextUrl = nextRecordsUrl
        for (let i = 1; i < iterations; i++) {
            const { records, nextRecordsUrl } = await getAdditionalRecords(nextUrl)
            orderRecords.push(...records)
            nextUrl = nextRecordsUrl
        }
    }

    return orderRecords.map(record => record.Id)
}

const getAdditionalRecords = async route => {
    const { data } = await axios({
        method: 'get',
        url: `${BASE_URL}/${route}`,
        headers: {
            'content-type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + accessToken,
        },
    })
    return data
}

const createPdfForOrder = orderId => new Promise((resolve, reject) => {
    fs.copyFile(
        `${__dirname}/TestPdf.pdf`,
        `${__dirname}/bpo-pdfs/${orderId}.pdf`,
        err => {
            if (err) reject(err)
            resolve()
        })
})

run().then(() => console.log('done')).catch(error => console.error(error.message))
