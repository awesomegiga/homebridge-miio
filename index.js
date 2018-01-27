"use strict";

const miio = require('miio');
const browser = require('miio').devices({
	cacheTime: 300, useTokenStorage: false,  tokens: {55067759:"5a593aeeb06f3e2861fd8de9b8597fe7"}
});

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  // register platform in to homebridge
  homebridge.registerPlatform("homebridge-miio", "XiaomiMiio", XiaomiMiio, true);
};

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function XiaomiMiio(log, config, api) {
  this.log = log;
  this.config = config || {};
  this.accessories = [];

	var self = this;

	var addDiscoveredDevice = function(device) {
		var uuid = UUIDGen.generate(device.name.toString());
		var accessory;

		accessory = self.accessories[uuid];

		if (accessory === undefined) {
			self.addAccessory(device);
		}
		else if (accessory instanceof miioAccessory) {
			self.log("Online and can update device: %s [%s]", accessory.displayName, device.id);
			// accessory.setupDevice(device);
			// accessory.observeDevice(device);
		}
		else {
			self.log("Online: %s [%s]", accessory.displayName, device.id);
			self.accessories[uuid] = new miioAccessory(self.log, accessory, device);
		}
	}

	if (api) {
		this.api = api;

		this.api.on('didFinishLaunching', function() {
			//browser.start();
			browser.on('available', (device) =>{
				self.log('MDNS search: device available');
				addDiscoveredDevice(device)});
		});
	}

	setInterval(
			function(){
					//browser.stop();
					//browser.start();
					browser.on('available', (device)=>{
						addDiscoveredDevice(rdevice)});
			},
			20000
	);
}

XiaomiMiio.prototype.addAccessory = function(device) {
    var serviceType;
		var miioInfo = device;

		// if(! miioInfo) {
		// 	return;
		// }
		// miioInfo.address = device.addresses[0];
		// miioInfo.port = device.port;

    switch(device..metadata.types) {
        case 'air-purifier':
            serviceType = Service.AirPurifier;
            break;
				case 'Light':
						serviceType = Service.Lightbulb;
						break;
        default:
            this.log("This Xiaomi Device is not Supported (yet): %s", device.model);
    }

    if (serviceType === undefined) {
        return;
    }

    this.log("Device found: %s [%s]", device.model, device.id);

		var accessory = new Accessory(device.id, UUIDGen.generate(device.id.toString()));
		var service = accessory.addService(serviceType, device.id);

		this.accessories[accessory.UUID] = new miioAccessory(this.log, accessory, device);
		this.api.registerPlatformAccessories("homebridge-miio", "XiaomiMiio", [accessory]);
}


XiaomiMiio.prototype.removeAccessory = function(accessory) {
    this.log("Remove Accessory: %s", accessory.displayName);

    if (this.accessories[accessory.UUID]) {
        delete this.accessories[accessory.UUID];
    }

    this.api.unregisterPlatformAccessories("homebridge-miio", "XiaomiMiio", [accessory]);
}

XiaomiMiio.prototype.configureAccessory = function(accessory) {
    accessory.updateReachability(false);
    this.accessories[accessory.UUID] = accessory;
}


function miioAccessory(log, accessory, device) {
    var self = this;

    this.accessory = accessory;
    this.device = device;
    this.log = log;

    // this.setupDevice(device);
    // this.updateReachability(true);

    this.accessory.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, "Xiaomi")
        .setCharacteristic(Characteristic.Model, device.model)
        .setCharacteristic(Characteristic.SerialNumber, device.id)

    this.accessory.on('identify', function(paired, callback) {
        self.log("%s - identify", self.accessory.displayName);
        callback();
    });

    // this.observeDevice(device);
    // this.addEventHandlers();
}

XiaomiMiio.prototype.updateReachability = function(reachable) {
    this.accessory.updateReachability(reachable);
}
