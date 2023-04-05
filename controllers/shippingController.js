import { Shipping } from '../models/index.js';
import Easypost from "@easypost/api"
import CustomErrorHandler from '../services/CustomErrorHandler.js';
import axios from 'axios';

const shippingController = {
    async store(req, res, next) {
        const { sender, recipient, addons, date } = req.body;
        let document;
        try {
            document = await Shipping.create({
                sender,
                recipient,
                'packages': req.body.packages,
                addons
            });
        } catch (err) {
            return next(err);
        }
        res.status(201).json(document);
    },

    async setPaymentLink(req, res, next) {
        const { link } = req.body;

        let document;
        try {
            document = await Shipping.findOneAndUpdate(
                { _id: req.params.id },
                { paymentLink: link },
                { new: true }
            )
        } catch (err) {
            return next(err);
        }
        res.status(201).json(document);
    },

    async show(req, res, next) {
        let document;
        try {
            document = await Shipping.findOne({ _id: req.params.id }).select(
                '-updatedAt -__v'
            );
        } catch (err) {
            return next(CustomErrorHandler.serverError());
        }
        return res.json(document);
    },
    async orders(req, res, next) {
        let document;
        try {
            document = await Shipping.find({ userid: req.params.id }).select(
                '-updatedAt -__v'
            );
        } catch (err) {
            return next(CustomErrorHandler.serverError());
        }
        return res.json(document);
    },

    async shippingRate(req, res) {
        const { recipient, packages, sender, addons, date } = req.body;
        const { postal_code: recieverPostal, country: reveiverCountry, } = recipient

        const { country: senderCountry, } = sender
        const requestedPackageLineItems = packages.map(p => {
            return {
                weight: {
                    units: "LB",
                    value: +p.box.weight
                },
                dimensions: {
                    length: 43,
                    width: 40,
                    height: 65,
                    units: "CM"
                }
            };
        });
        const shippingData = {
            "accountNumber": {
                "value": "121059770"
            },
            "rateRequestControlParameters": {
                "returnTransitTimes": true
            },
            "requestedShipment": {
                "shipper": {
                    "address": {
                        "postalCode": "569933",
                        "countryCode": senderCountry
                    }
                },
                "recipient": {
                    "address": {
                        "postalCode": recieverPostal,
                        "countryCode": reveiverCountry
                    }
                },
                "customsClearanceDetail": {
                    "dutiesPayment": {
                        "paymentType": "SENDER",
                        "payor": {
                            "responsibleParty": null
                        }
                    },
                    "commodities": [
                        {
                            "description": "Camera",
                            "quantity": 1,
                            "quantityUnits": "PCS",
                            "weight": {
                                "units": "KG",
                                "value": 20
                            },
                            "customsValue": {
                                "amount": 100,
                                "currency": "USD"
                            }
                        }
                    ]
                },
                "pickupType": "DROPOFF_AT_FEDEX_LOCATION",
                "shipDateStamp": date,
                "rateRequestType": [
                    "LIST",
                    "ACCOUNT"
                ],
                "requestedPackageLineItems": requestedPackageLineItems
            }
        }
        try {
            const authResponse = await axios.post("https://apis.fedex.com/oauth/token", {
                'grant_type': 'client_credentials',
                'client_id': 'l705f47025631443e39c111c0956a335c5',
                'client_secret': '3ae0c814-6b79-46e3-b9d6-e7849ef09ef7'
            },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

            const accessToken = authResponse.data.access_token;
            console.log("Access", accessToken)
            const rateResponse = await axios.post("https://apis.fedex.com/rate/v1/rates/quotes",
                shippingData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    }
                }
            );
            console.log("ship,",rateResponse)
            const shippingRate = rateResponse.data.output.rateReplyDetails[0]
            res.json({ shippingRate });
        } catch (error) {
            console.error(error);
            res.status(500).json(error)
        }
    }
};

//     );
// 
//     res.json({ shippingRate });
// } catch(error) {
//     // console.error(error);
//     res.status(500).json(error)
// }


export default shippingController;
