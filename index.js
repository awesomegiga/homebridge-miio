"use strict";

const browser = require('tinkerhub-mdns').browser({
	type: 'miio',
	protocol: 'udp'
});

const miio = require('miio');

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
  // console.log("homebridge API version: " + homebridge.version);

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
  this.accessories = {};
	this.api = api;

	var self = this;

	var addDiscoveredDevice = function(device) {
		var uuid = UUIDGen.generate(device.token);
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

	// if (api) {

		this.api.on('didFinishLaunching', ()=> {
			browser.start();
			browser.on('available', (device) =>
				addDiscoveredDevice);
		});
	// }

	setInterval(
			function(){
					browser.start();
					browser.on('available', (device) =>
						addDiscoveredDevice);
			},
			10000
	);
}

XiaomiMiio.prototype.addAccessory = function(device) {
    var serviceType;
		var miioInfo = miio.infoFromHostname(device.name);
		if(! miioInfo) {
			return;
		}
		miioInfo.address = device.addresses[0];
		miioInfo.port = device.port;

    switch(miioInfo.type) {
        case 'AirPurifier':
            serviceType = Service.AirPurifier
            break;
        default:
            this.log("This Xiaomi Device is not Supported (yet): %s [%s]", device.name);
    }

    if (serviceType === undefined) {
        return;
    }

    this.log("Device found: %s [%s]", device.name, device.id);

		var accessory = new Accessory(device.id, UUIDGen.generate(device.token));
		var service = accessory.addService(serviceType, device.id);

		this.accessories[accessory.UUID] = new miioAccessory(this.log, accessory, device);
		this.api.registerPlatformAccessories("homebridge-miio", "XiaomiMiio", [accessory]);
}


function miioAccessory(log, accessory, device) {
    var self = this;

    this.accessory = accessory;
    this.device = device;
    this.log = log;

    // this.setupDevice(device);
    this.updateReachability(true);

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
