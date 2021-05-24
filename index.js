const fs = require('fs')
const qs = require('qs')
const _axios = require('axios')
const axios = _axios.create()
const API_CONFIG = {
    client_id: '3MVG9dCCPs.KiE4Q3KI9zs8pqt1vgSwYjH0Do1nMJxI3D5FWrpCo1hMOGWF6RJZ52KN3QGuT0qGpS1ED0hN3c',
    client_secret: 'BB9036A00819448EB0218A2B0A439AC59897B5B46716B7162DD293632202593C',
    username: 'arsmith@amherst.com.qa',
    password: 'Fenderstrat90hiB4bBkSJRjyiQvOBBod7CH',
    grant_type: 'password',
}
const BASE_URL = 'https://amherst--qa.my.salesforce.com'
let accessToken
const ORDERS_QUERY = 'select OrderId__c from BpoOrder__c where OrderId__c != null and BpoPdfId__c = null limit 100'
// const ORDERS_QUERY = "select OrderId__c, Id, Street__c, City__c, State__c, Zipcode__c from BpoOrder__c where Batch__c = 'a362g000000YI3sAAG'"
// const ORDERS_QUERY = "select Id, Street__c, City__c, State__c, Zipcode__c from BpoOrder__c where Batch__c = 'a362g000000YI3sAAG'"
// const ORDERS_QUERY = "select OrderId__c from BpoOrder__c where Batch__c = 'a362g000000YI3sAAG'"

async function getOrdersForCompletedReport() {
    await getToken()

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

    console.log(JSON.stringify(orderRecords.map(({ attributes, ...rest }) => rest)))
}

async function run() {
    await getToken()

    const orderIds = await getOrderIds()
    console.log('number of orders', orderIds.length)

    await Promise.all(
        orderIds.map(createPdfForOrder)
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

const getVendorOrderIds = () => {
    const orderIds = []
    for (let i = 1; i < 201; i++) {
        orderIds.push(i)
    }
    return orderIds
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

    return orderRecords.map(record => record.OrderId__c)
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
// getOrdersForCompletedReport()