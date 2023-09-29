const isDevStage = false;

Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000));
    return this;
}
Date.prototype.addTime = function(h){
    this.setTime(this.getTime() + (h*60*1000));
    return this;
}

Date.prototype.addSec = function(s){
    this.setTime(this.getTime() + (s*1000));
    return this;
}

const dateWithTime  = () => {
    return isDevStage ? new Date().addHours(8).toISOString() : new Date().addHours(8).toISOString();
} 

const dateOnly = () => {
    return isDevStage ? new Date().toISOString().slice(0,10) : new Date().addHours(8).toISOString().slice(0,10);
} 

const dateValid35 = () => {
    return isDevStage ? new Date().addSec(35).toISOString() : new Date().addHours(8).addSec(35).toISOString();
}

const dateValid60 = () => {
    return isDevStage ? new Date().addSec(60).toISOString() : new Date().addHours(8).addSec(60).toISOString();
}

const dateValid120 = () => {
    return isDevStage ? new Date().addSec(120).toISOString() : new Date().addHours(8).addSec(120).toISOString();
}

const dateLoginExpiration = () => {
    return isDevStage ? new Date().getTime() + 1000 * 60 * 60 : new Date().getTime() + 1000 * 60 * 60 * 9;
}

const cookieExpiration = () => {
    return new Date().getTime() +  60 * 60 * 10;
}

module.exports = {
    dateOnly,
    dateWithTime,
    dateValid35,
    dateValid60,
    dateValid120,
    dateLoginExpiration,
    cookieExpiration
}