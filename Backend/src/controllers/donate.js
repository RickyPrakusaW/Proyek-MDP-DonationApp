const db = require("../models");
const sequelize = require("sequelize");

async function createDonation(req, res) {
    const t = await db.sequelize.transaction();
    try {
        const { campaignId, amount, isAnonymous } = req.body;
        const userId = req.user.userId;

        // Cek campaign
        const campaign = await db.Campaign.findOne({ where: { campaign_id:campaignId } });
        if (!campaign) {
            await t.rollback();
            return res.status(404).json({ message: "Campaign tidak ditemukan" });
        }
        if (campaign.status !== 'active') {
            await t.rollback();
            return res.status(400).json({ message: "Campaign tidak aktif" });
        }

        // Generate donationId
        const lastDonation = await db.Donation.findOne({ order: [["donation_id", "DESC"]] });
        let newIdNumber = 1;
        if (lastDonation) {
            const lastIdNumber = parseInt(lastDonation.donation_id.substring(3));
            newIdNumber = lastIdNumber + 1;
        }
        const donationId = `DON${String(newIdNumber).padStart(3, '0')}`;

        // Buat donasi
        const donation = await db.Donation.create({
            donation_id:donationId,
            user_id:userId,
            campaign_id:campaignId,
            amount,
            is_anonymous: isAnonymous || false,
            status: 'success', // Asumsi langsung sukses
            createdAt: new Date(),
            updatedAt: new Date(),
        }, { transaction: t });

        // Update currentAmount di campaign
        campaign.current_amount = campaign.current_amount + amount;
        await campaign.save({ transaction: t });

        await t.commit();
        return res.status(201).json(donation);
    } catch (err) {
        await t.rollback();
        return res.status(500).json({ message: "Gagal membuat donasi", error: err.message });
    }
}

async function getDonationHistory(req, res) {
    try {
        const userId = req.user.userId;
        const donations = await db.Donation.findAll({ where: { user_id:userId } });
        return res.status(200).json(donations);
    } catch (err) {
        return res.status(500).json({ message: "Gagal mengambil riwayat donasi", error: err.message });
    }
}

async function getDonationsByCampaign(req, res) {
    try {
        const { id } = req.params; // campaign_id
        const donations = await db.Donation.findAll({
            where: { campaign_id: id },
            include: [{
                model: db.User,
                attributes: ['firstName', 'lastName']
            }],
            order: [['createdAt', 'DESC']]
        });

        const formattedDonations = donations.map(d => ({
            nama_donatur: d.is_anonymous ? 'Anonim' : `${d.User.firstName} ${d.User.lastName}`,
            jumlah: d.amount,
            waktu_donasi: d.createdAt
        }));

        return res.status(200).json(formattedDonations);
    } catch (err) {
        return res.status(500).json({ message: "Gagal mengambil data donasi campaign", error: err.message });
    }
}

module.exports = {
    createDonation,
    getDonationHistory,
    getDonationsByCampaign,
};
