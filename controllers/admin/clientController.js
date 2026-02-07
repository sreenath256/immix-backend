const Client = require("../../models/clientModel");
const ClientPricing = require("../../models/clientPricingModel");
const ClientDataCenter = require("../../models/clientDataCenterModel");


const createClient = async (req, res) => {
    try {
        console.log(req.body)
        const {
            name,
            registeredCountry,
            registeredCity,
            address,
            pincode,
            email,
            phone,
            dataCenters,
            pricing
        } = req.body;



        // 1️⃣ Create client first
        const client = await Client.create({
            name,
            registeredCountry,
            registeredCity,
            address,
            pincode,
            email,
            phone,
            isActive: true
        });

        // 2️⃣ Insert pricing
        if (pricing && pricing.length > 0) {
            const pricingDocs = pricing.map(p => ({
                clientId: client._id,
                countryId: p.countryId,
                standardHourlyRate: p.standardHourlyRate,
                offStandardHourlyRate: p.offStandardHourlyRate,
                commuteHourlyRate: p.commuteHourlyRate
            }));
            await ClientPricing.insertMany(pricingDocs);
        }

        // 3️⃣ Insert Data Center mappings
        if (dataCenters && dataCenters.length > 0) {
            const mappingDocs = dataCenters.map(dcId => ({
                clientId: client._id,
                dataCenterId: dcId
            }));
            await ClientDataCenter.insertMany(mappingDocs);
        }

        res.json({
            success: true,
            message: "Client created successfully",
            clientId: client._id
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


const getAllClients = async (req, res) => {
    try {
        const { search, isActive, registeredCountry, registeredCity, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let filter = {};

        if (isActive) filter.isActive = isActive === 'true';
        if (registeredCountry) filter.registeredCountry = registeredCountry;
        if (registeredCity) filter.registeredCity = registeredCity;

        if (search) {
            const searchTerms = search.trim();
            const searchRegex = new RegExp(searchTerms.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i');

            filter.$or = [
                { name: searchRegex },
                { address: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { pincode: searchRegex }
            ];
        }

        const [total, clients] = await Promise.all([
            Client.countDocuments(filter),
            Client.find(filter)
                .populate("registeredCountry")
                .populate("registeredCity")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
        ]);

        res.json({
            success: true,
            data: clients,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


const getClient = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id)
            .populate("registeredCountry")
            .populate("registeredCity");

        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }

        const pricing = await ClientPricing.find({ clientId: client._id }).populate("countryId");

        const dataCenters = await ClientDataCenter.find({ clientId: client._id })
            .populate("dataCenterId");

        res.json({
            success: true,
            client,
            pricing,
            dataCenters
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


const updateClient = async (req, res) => {
    try {
        const clientId = req.params.id;

        const {
            name,
            registeredCountry,
            registeredCity,
            address,
            pincode,
            email,
            phone,
            dataCenters,
            pricing
        } = req.body;

        // 1️⃣ UPDATE CLIENT MAIN INFO
        const client = await Client.findByIdAndUpdate(
            clientId,
            {
                name,
                registeredCountry,
                registeredCity,
                address,
                pincode,
                email,
                phone,
            },
            { new: true }
        );

        // 2️⃣ UPDATE PRICING
        if (pricing) {
            // Delete previous pricing
            await ClientPricing.deleteMany({ clientId });

            // Insert new pricing
            const pricingDocs = pricing.map(p => ({
                clientId,
                countryId: p.countryId,
                standardHourlyRate: p.standardHourlyRate,
                offStandardHourlyRate: p.offStandardHourlyRate,
                commuteHourlyRate: p.commuteHourlyRate
            }));
            await ClientPricing.insertMany(pricingDocs);
        }

        // 3️⃣ UPDATE DATA CENTER MAPPING
        if (dataCenters) {
            // Delete previous mappings
            await ClientDataCenter.deleteMany({ clientId });

            // Insert new mappings
            const mappingDocs = dataCenters.map(dcId => ({
                clientId,
                dataCenterId: dcId
            }));
            await ClientDataCenter.insertMany(mappingDocs);
        }

        // 4️⃣ RETURN UPDATED DATA
        res.json({
            success: true,
            message: "Client updated successfully",
            data: client
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

const toggleClientStatus = async (req, res) => {
    try {

        const client = await Client.findByIdAndUpdate(
            req.params.id,
            { isActive: !req.body.isActive },
            { new: true }
        );

        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }

        const updatedClient = await Client.findById(req.params.id).populate("registeredCountry registeredCity");

        res.json({ success: true, message: "Client status toggled", data: updatedClient });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}



const deleteClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(
            req.params.id,
        );

        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }

        res.json({ success: true, message: "Client deleted", data: client });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}

module.exports = {
    createClient,
    getAllClients,
    getClient,
    updateClient,
    toggleClientStatus,
    deleteClient
}