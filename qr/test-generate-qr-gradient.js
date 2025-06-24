const { QRCodeStyling } = require('qr-code-styling/lib/qr-code-styling.common.js');
const nodeCanvas = require('canvas');
const { JSDOM } = require('jsdom');
const fs = require('fs');

const options = {
    width: 500,
    height: 500,
    data: "yourapp://qr/permanent/test-uuid-123",
    image: "qr/DeWatermark.ai_1730802709042__1_-removebg 1.png",
    margin: 20,
    qrOptions: {
        errorCorrectionLevel: 'H',
        typeNumber: 0,
        mode: 'Byte',
    },
    dotsOptions: {
        gradient: {
            type: 'linear',
            rotation: Math.PI * 0.75, // 135 градусов (вверх-лево -> вниз-право)
            colorStops: [
                { offset: 0, color: '#665BFF' }, // левый верх
                { offset: 1, color: '#FF644F' }  // правый низ
            ]
        },
        type: 'rounded',
    },
    backgroundOptions: {
        color: '#fff',
    },
    imageOptions: {
        margin: 20,
        imageSize: 0.5, // 50% от QR
        crossOrigin: 'anonymous',
        hideBackgroundDots: true,
        saveAsBlob: true
    },
    cornersSquareOptions: {
        type: 'extra-rounded',
        gradient: {
            type: 'linear',
            rotation: Math.PI * 0.75,
            colorStops: [
                { offset: 0, color: '#665BFF' },
                { offset: 1, color: '#FF644F' }
            ]
        }
    },
    cornersDotOptions: {
        type: 'dot',
        color: '#FF644F',
    },
    nodeCanvas,
    jsdom: JSDOM,
};

const qrCode = new QRCodeStyling(options);

qrCode.getRawData('png').then((buffer) => {
    fs.writeFileSync('test_qr_gradient_logo.png', buffer);
    console.log('QR-код с градиентом и логотипом успешно сохранён: test_qr_gradient_logo.png');
}); 