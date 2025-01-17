import * as language from "../utils/language"
import * as workers from "../utils/workers"

const utils = require("../utils/utils")

export async function updateUserKeys(self, cb){
    if(!self.state.isLoggedIn){
        return false
    }

    if(!window.customFunctions.isDeviceOnline()){
        return false
    }

    const updateUserKeypair = async (pub, priv, callback) => {
        try{
            var res = await utils.apiRequest("POST", "/v1/user/keyPair/update", {
                apiKey: self.state.userAPIKey,
                publicKey: pub,
                privateKey: await utils.encryptMetadata(priv, self.state.userMasterKeys[self.state.userMasterKeys.length - 1])
            })
        }
        catch(e){
            if(typeof callback == "function"){
                return callback(e)
            }

            console.log(e)

            return false
        }

        if(!res.status){
            if(typeof callback == "function"){
                return callback(res.message)
            }

            console.log(res.message)

            if(res.message.toLowerCase().indexOf("api key not found") !== -1){
                return window.customFunctions.logoutUser()
            }

            return false
        }

        if(typeof callback == "function"){
            return callback(null, true)
        }

        return true
    }

    const setUserKeypair = async (pub, priv, callback) => {
        try{
            var res = await utils.apiRequest("POST", "/v1/user/keyPair/set", {
                apiKey: self.state.userAPIKey,
                publicKey: pub,
                privateKey: await utils.encryptMetadata(priv, self.state.userMasterKeys[self.state.userMasterKeys.length - 1])
            })
        }
        catch(e){
            if(typeof callback == "function"){
                return callback(e)
            }

            console.log(e)

            return false
        }

        if(!res.status){
            if(typeof callback == "function"){
                return callback(res.message)
            }

            console.log(res.message)

            if(res.message.toLowerCase().indexOf("api key not found") !== -1){
                return window.customFunctions.logoutUser()
            }

            return false
        }

        if(typeof callback == "function"){
            return callback(null, true)
        }

        return true
    }

    const updatePubAndPrivKey = async () => {
        try{
            var res = await utils.apiRequest("POST", "/v1/user/keyPair/info", {
                apiKey: self.state.userAPIKey
            })
        }
        catch(e){
            if(typeof cb == "function"){
                cb(e)
            }

            return console.log(e)
        }

        if(!res.status){
            if(typeof cb == "function"){
                cb("api key not found")
            }

            if(res.message.toLowerCase().indexOf("api key not found") !== -1){
                return window.customFunctions.logoutUser()
            }
            
            return console.log(res.message)
        }

        if(res.data.publicKey.length > 16 && res.data.privateKey.length > 16){
            let privKey = ""

            for(let i = 0; i < self.state.userMasterKeys.length; i++){
                if(privKey.length == 0){
                    try{
                        let decrypted = await utils.decryptMetadata(res.data.privateKey, self.state.userMasterKeys[i])

                        if(typeof decrypted == "string"){
                            if(decrypted.length > 16){
                                privKey = decrypted

                                break
                            }
                        }
                    }
                    catch(e){
                        //console.log(e)

                        continue
                    }
                }
            }

            if(privKey.length > 16){
                try{
                    await workers.localforageSetItem("userPublicKey", res.data.publicKey)
                    await workers.localforageSetItem("userPrivateKey", privKey)
                }
                catch(e){
                    if(typeof cb == "function"){
                        cb(e)
                    }
                    
                    return console.log(e)
                }

                self.setState({
                    userPublicKey: res.data.publicKey,
                    userPrivateKey: privKey
                })

                console.log("Public and private key updated.")

                return updateUserKeypair(res.data.publicKey, privKey, (err) => {
                    if(typeof cb == "function"){
                        cb(null)
                    }
                    
                    if(err){
                        return console.log(err)
                    }

                    return console.log("User keypair updated.")
                })
            }
            else{
                if(typeof cb == "function"){
                    cb(null)
                }

                return console.log("Could not decrypt private key")
            }
        }
        else{
            try{
                let generatedKeypair = await window.crypto.subtle.generateKey({
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-512"
                }, true, ["encrypt", "decrypt"])

                let exportedPubKey = await window.crypto.subtle.exportKey("spki", generatedKeypair.publicKey)
                let b64PubKey = utils.base64ArrayBuffer(exportedPubKey)

                let exportedPrivKey = await window.crypto.subtle.exportKey("pkcs8", generatedKeypair.privateKey)
                let b64PrivKey = utils.base64ArrayBuffer(exportedPrivKey)

                if(b64PubKey.length > 16 && b64PrivKey.length > 16){
                    setUserKeypair(b64PubKey, b64PrivKey, (err) => {
                        if(err){
                            return console.log(err)
                        }

                        return console.log("User keypair generated and updated.")
                    })
                }
                else{
                    return console.log("Key lengths invalid")
                }
            }
            catch(e){
                return console.log(e)
            }
        }
    }

    try{
        var res = await utils.apiRequest("POST", "/v1/user/masterKeys", {
            apiKey: self.state.userAPIKey,
            masterKeys: await utils.encryptMetadata(self.state.userMasterKeys.join("|"), self.state.userMasterKeys[self.state.userMasterKeys.length - 1])
        })
    }
    catch(e){
        if(typeof cb == "function"){
            cb(e)
        }
        
        return console.log(e)
    }

    if(!res.status){
        if(typeof cb == "function"){
            cb(res.message)
        }

        if(res.message.toLowerCase().indexOf("api key not found") !== -1){
            return window.customFunctions.logoutUser()
        }

        return console.log(res.message)
    }

    let newKeys = ""

    for(let i = 0; i < self.state.userMasterKeys.length; i++){
        try{
            if(newKeys.length == 0){
                let decrypted = await utils.decryptMetadata(res.data.keys, self.state.userMasterKeys[i])

                if(typeof decrypted == "string"){
                    if(decrypted.length > 16){
                        newKeys = decrypted

                        break
                    }
                }
            }
        }
        catch(e){
            //console.log(e)

            continue
        }
    }

    if(newKeys.length > 16){
        try{
            await workers.localforageSetItem("userMasterKeys", await workers.JSONStringifyWorker(newKeys.split("|")))
        }
        catch(e){
            if(typeof cb == "function"){
                cb(e)
            }
    
            return console.log(e)
        }

        self.setState({
            userMasterKeys: newKeys.split("|")
        }, () => {
            window.customVariables.userMasterKeys = newKeys.split("|")

            console.log("Master keys updated.")
        
            return updatePubAndPrivKey()
        })
    }
    else{
        console.log("Could not decrypt master keys.")

        if(typeof cb == "function"){
            cb(null)
        }

        return false
    }
}

export async function updateUserUsage(self){
    if(!self.state.isLoggedIn){
        return false
    }

    if(!window.customFunctions.isDeviceOnline()){
        return false
    }

    try{
        var res = await utils.apiRequest("POST", "/v1/user/usage", {
            apiKey: self.state.userAPIKey
        })
    }
    catch(e){
        return console.log(e)
    }

    if(!res.status){
        console.log(res.message)

        if(res.message.toLowerCase().indexOf("api key not found") !== -1){
            return window.customFunctions.logoutUser()
        }

        return false
    }

    let storageUsedPercent = ((res.data.storage / res.data.max) * 100).toFixed(2)

    return self.setState({
        userStorageUsagePercentage: storageUsedPercent,
        userStorageUsageMenuText: language.get(self.state.lang, "userStorageUsageMenuText", false, ["__MAX__", "__PERCENTAGE__"], [utils.formatBytes(res.data.max), storageUsedPercent]) + " (" + utils.formatBytes(res.data.storage) + ")",
		userCurrentStorageUsage: res.data.storage,
		userMaxStorage: res.data.max,
        userFiles: res.data.uploads,
        userFolders: res.data.folders,
        twoFactorEnabled: res.data.twoFactorEnabled,
        userIsPro: res.data.pro
    })
}