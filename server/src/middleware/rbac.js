const Membership = require('../models/Membership');

/**
 * requireChannelMembership - verifies req.user is a member of req.params.channelId
 * Attaches req.membership to the request for downstream use.
 */
const requireChannelMembership = async (req, res, next) => {
  try {
    const channelId = req.params.channelId || req.params.id;
    const membership = await Membership.findOne({
      user: req.user._id,
      channel: channelId,
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this channel.' });
    }

    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * requireRole - factory that returns middleware ensuring the user has at least the given role.
 * Role hierarchy: owner > admin > member
 */
const ROLE_HIERARCHY = { owner: 3, admin: 2, member: 1 };

const requireRole = (minRole) => async (req, res, next) => {
  try {
    const channelId = req.params.channelId || req.params.id;
    const membership = req.membership || await Membership.findOne({
      user: req.user._id,
      channel: channelId,
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this channel.' });
    }

    const userLevel = ROLE_HIERARCHY[membership.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `This action requires at least ${minRole} role.`,
      });
    }

    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireChannelMembership, requireRole };
