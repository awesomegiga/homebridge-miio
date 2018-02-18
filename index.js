"use strict";

const miio = require('miio');
const browser = miio.devices({
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
  homebridge.registerPlatform("homebridge-miio", "miAccessory", XiaomiMiio, true);
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
		var uuid = UUIDGen.generate(device.id.toString());
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


		this.api.on('didFinishLaunching', function() {
			browser.on('available', (device) =>{
				self.log('MDNS search: device discovered', device.model);
				if(! device.token) {console.log(device.id, 'hides its token');}
				addDiscoveredDevice(device)});
		});

	setInterval(
			function(){
					browser.on('available', (device)=>{
						self.log('MDNS search: device discovered', device.model);
						if(! device.token) {console.log(device.id, 'hides its token');}
						addDiscoveredDevice(device)});
			},
			20000
	);
}

XiaomiMiio.prototype.addAccessory = function(device) {
    var serviceType;

		this.log('Try to add device', device.id, device.model, device.token);

		if(device.device.matches('type:air-purifier')) {
			this.log('device type is air-purifier');
			serviceType = Service.AirPurifier;
		}
		else if(device.id.toString() == "55067759"){
		// else if(device.device.matches('type:light')) {
			this.log('device type is light');
			serviceType = Service.Lightbulb;
		}
		else{
			this.log("This Xiaomi Device is not Supported (yet): %s", device.model);
		}

		if (serviceType === undefined) {
		    return;
		}

    this.log("Device found: %s [%s]", device.model, device.id);

		var accessory = new Accessory(device.model.toString(), UUIDGen.generate(device.id.toString()));
		var service = accessory.addService(serviceType, device.model.toString());

		this.accessories[accessory.UUID] = new miioAccessory(this.log, accessory, device);
		this.api.registerPlatformAccessories("homebridge-miio", "miAccessory", [accessory]);
}

XiaomiMiio.prototype.removeAccessory = function(accessory) {
    this.log("Remove Accessory: %s", accessory.displayName);

    if (this.accessories[accessory.UUID]) {
        delete this.accessories[accessory.UUID];
    }

    this.api.unregisterPlatformAccessories("homebridge-miio", "miAccessory", [accessory]);
}


XiaomiMiio.prototype.configureAccessory = function(accessory) {
    this.accessories[accessory.UUID] = accessory;
}


function miioAccessory(log, accessory, device) {
    var self = this;

    this.accessory = accessory;
    this.device = device;
    this.log = log;

    this.setupDevice(device);
    // this.updateReachability(true);

    this.accessory.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, "Xiaomi")
        .setCharacteristic(Characteristic.Model, device.model)
        .setCharacteristic(Characteristic.SerialNumber, device.id);

    this.accessory.on('identify', function(paired, callback) {
        self.log("%s - identify", self.accessory.displayName);
        callback();
    });

    // this.observeDevice(device);
    this.addEventHandlers();
}

// miioAccessory.prototype.updateReachability = function(reachable) {
//     this.accessory.updateReachability(reachable);
// }
//
// miioAccessory.prototype.configureAccessory = function(accessory) {
//     accessory.updateReachability(false);
//     this.accessories[accessory.UUID] = accessory;
// }

miioAccessory.prototype.addEventHandler = function(serviceName, characteristic) {
		if (service === undefined) {
			return;
		}
		if (service.testCharacteristic(characteristic) === false) {
				return;
		}

		switch(characteristic) {
					case Characteristic.Active:
							service
									.getCharacteristic(characteristic)
									.on('set', this.setAirPurifierState.bind(this));
							break;
						}
}

miioAccessory.prototype.addEventHandlers = function() {
    this.addEventHandler(Service.AirPurifier, Characteristic.Active);
    this.addEventHandler(Service.Lightbulb, Characteristic.On);
    this.addEventHandler(Service.Lightbulb, Characteristic.Brightness);
}

miioAccessory.prototype.setupDevice = function(device) {
    this.device = device;
    // this.client = wemo.client(device);

    this.device.on('error', function(err) {
        this.log('%s reported error %s', this.accessory.displayName, err);
    }.bind(this));
}

miioAccessory.prototype.setAirPurifierState = function(state, callback) {
	var value = state | 0;
	var service = this.accessory.getService(Service.AirPurifier) || this.accessory.getService(Service.Lightbulb);
	var AirPurifierState = service.getCharacteristic(Characteristic.Active);
	callback = callback || function() {};

	if (AirPurifierState.value != value) {  //remove redundent calls to setBinaryState when requested state is already achieved
			this.client.setPower(value)
			.then(PowerState => this.log("%s - Set state: %s", this.accessory.displayName, (value ? "On" : "Off"))
			)
		.catch(
			err => this.log("%s - Set state FAILED: %s. Error: %s", this.accessory.displayName, (value ? "on" : "off"), err)
		);
	}
	else {
			callback(null);
	}
}
