const db = require("../models");

module.exports = {
    getAll: async function(req, res) {
        try {
            let campaigns;
            const userId = req.user.userId
            console.log(userId)
            if (req.user.role === 'donatur') {
                campaigns = await db.Campaign.findAll({ where: { status: 'active' } });
            } 
            else if(req.user.role === 'fundraiser'){
                campaigns = await db.Campaign.findAll({ where: { user_id: req.user.userId } });

            }else {
                campaigns = await db.Campaign.findAll();
            }
            return res.status(200).json(campaigns);
        } catch (err) {
            return res.status(500).json({ message: "Gagal mengambil data campaign", error: err.message });
        }
    },
    getById: async function(req, res) {
        try {
            const { id } = req.params;
            const campaign = await db.Campaign.findOne({ where: { campaign_id: id } });
            if (!campaign) return res.status(404).json({ message: "Campaign tidak ditemukan" });
            if (req.user.role === 'donatur' && campaign.status !== 'active') {
                return res.status(403).json({ message: "Campaign tidak ditemukan" });
            }
            return res.status(200).json(campaign);
        } catch (err) {
            return res.status(500).json({ message: "Gagal mengambil data campaign", error: err.message });
        }
    },
    create: async function(req, res) {
        try {
            // Hanya fundraiser yang bisa akses, sudah dicek di middleware
            const { title, description, imageUrl, targetAmount } = req.body;
            // Cari campaignId terakhir
            const lastCampaign = await db.Campaign.findOne({ order: [["campaign_id", "DESC"]] });
    
            let newIdNumber = 1;
            if (lastCampaign) {
                const lastIdNumber = parseInt(lastCampaign.campaign_id.substring(2));
                newIdNumber = lastIdNumber + 1;
            }
            const campaignId = `US${String(newIdNumber).padStart(3, '0')}`;
            const campaign = await db.Campaign.create({
                campaign_id:campaignId,
                user_id : req.user.id,
                title,
                description,
                imageUrl,
                targetAmount,
                currentAmount: 0,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            return res.status(201).json(campaign);
        } catch (err) {
            return res.status(500).json({ message: "Gagal membuat campaign", error: err.message });
        }
    },
    setStatus: async function(req, res) {
        try {
            // Hanya admin yang bisa akses, sudah dicek di middleware
            const { id } = req.params;
            const { status } = req.body;
            const campaign = await db.Campaign.findOne({ where: { campaign_id: id } });
            if (!campaign) return res.status(404).json({ message: "Campaign tidak ditemukan" });
            campaign.status = status;
            if (status === 'cancelled') {
                campaign.deletedAt = new Date();
            }
            await campaign.save();
            return res.status(200).json({ message: "Status campaign berhasil diupdate", campaign });
        } catch (err) {
            return res.status(500).json({ message: "Gagal update status campaign", error: err.message });
        }
    },
    requestDisbursement: async function(req, res) {
        try {
            const { id } = req.params; // campaignId
            const { amount } = req.body;
            // Pastikan campaign milik fundraiser yang login
            const campaign = await db.Campaign.findOne({ where: { campaign_id: id, user_id: req.user.userId } });
            if (!campaign) return res.status(404).json({ message: "Campaign tidak ditemukan atau bukan milik Anda" });
            if (amount > campaign.current_amount) {
                return res.status(400).json({ message: "Dana tidak mencukupi" });
            }
            // Generate disbursementId
            const lastDisb = await db.Disbursement.findOne({ order: [["disbursementId", "DESC"]] });
            let newIdNumber = 1;
            if (lastDisb) {
                const lastIdNumber = parseInt(lastDisb.disbursementId.substring(2));
                newIdNumber = lastIdNumber + 1;
            }
            const disbursementId = `DS${String(newIdNumber).padStart(3, '0')}`;
            const disbursement = await db.Disbursement.create({
                disbursementId,
                campaignId: id,
                amount,
                status: 'pending',
                request_at: new Date(),
            });
            return res.status(201).json(disbursement);
        } catch (err) {
            return res.status(500).json({ message: "Gagal mengajukan pencairan dana", error: err.message });
        }
    },
    verifyDisbursement: async function(req, res) {
        try {
            const { id } = req.params; // disbursementId
            const { status } = req.body; // approved/rejected/processing
            const disbursement = await db.Disbursement.findOne({ where: { disbursement_id: id } });
            if (!disbursement) return res.status(404).json({ message: "Disbursement tidak ditemukan" });
            disbursement.status = status;
            if (status === 'approved' || status === 'rejected') {
                disbursement.processed_at = new Date();
            }
            await disbursement.save();
            return res.status(200).json({ message: "Status disbursement berhasil diupdate", disbursement });
        } catch (err) {
            return res.status(500).json({ message: "Gagal verifikasi disbursement", error: err.message });
        }
    },
    getAllDisbursements: async function(req, res) {
        try {
            const disbursements = await db.Disbursement.findAll();
            return res.status(200).json(disbursements);
        } catch (err) {
            return res.status(500).json({ message: "Gagal mengambil data disbursement", error: err.message });
        }
    }
}
