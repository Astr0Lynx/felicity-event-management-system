import { Event } from '../models/user.js';

//discussion forum feature

//post message
export async function postMessage(req, res) {
    try {
        const eventId = req.params.id;
        const { message, is_announcement = false, parent_message_id = null } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        //check if registered or organizer
        const isOrganizer = event.organizer_id.toString() === userId;
        const isRegistered = event.registered_participants.some(
            rp => rp.participant && rp.participant.toString() === userId
        );

        if (!isOrganizer && !isRegistered) {
            return res.status(403).json({
                success: false,
                message: 'Only registered participants and organizers can post in the forum'
            });
        }

        //only organizers can post announcements
        if (is_announcement && !isOrganizer) {
            return res.status(403).json({
                success: false,
                message: 'Only organizers can post announcements'
            });
        }

        //init forum if needed
        if (!event.discussion_forum) {
            event.discussion_forum = [];
        }

        //validate parent msg if reply
        if (parent_message_id) {
            const parentExists = event.discussion_forum.some(
                msg => msg.message_id.toString() === parent_message_id && !msg.deleted_at
            );
            if (!parentExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Parent message not found'
                });
            }
        }

        //create new msg
        const newMessage = {
            author: userId,
            author_type: userRole === 'organizer' ? 'Organizer' : 'Participant',
            message,
            is_announcement,
            parent_message_id,
            posted_at: new Date()
        };

        event.discussion_forum.push(newMessage);
        await event.save();

        //populate author for response
        await event.populate('discussion_forum.author', 'first_name last_name email');
        
        //get created msg with author
        const savedMessage = event.discussion_forum[event.discussion_forum.length - 1];

        res.status(201).json({
            success: true,
            message: 'Message posted successfully',
            data: savedMessage
        });
    } catch (error) {
        console.error('Error in postMessage:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//get forum messages
export async function getMessages(req, res) {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const event = await Event.findById(eventId)
            .select('name organizer_id registered_participants discussion_forum')
            .populate('discussion_forum.author', 'first_name last_name email')
            .populate('organizer_id', 'email')
            .lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        //check access
        const isOrganizer = event.organizer_id._id.toString() === userId;
        const isRegistered = event.registered_participants.some(
            rp => rp.participant && rp.participant.toString() === userId
        );

        if (!isOrganizer && !isRegistered) {
            return res.status(403).json({
                success: false,
                message: 'Only registered participants and organizers can view the forum'
            });
        }

        //filter deleted msgs and sort
        const messages = (event.discussion_forum || [])
            .filter(msg => !msg.deleted_at)
            .sort((a, b) => {
                //pinned first
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                //then by date
                return new Date(b.posted_at) - new Date(a.posted_at);
            });

        res.status(200).json({
            success: true,
            count: messages.length,
            is_organizer: isOrganizer,
            data: messages
        });
    } catch (error) {
        console.error('Error in getMessages:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//delete message (soft delete)
export async function deleteMessage(req, res) {
    try {
        const { id: eventId, messageId } = req.params;
        const userId = req.user.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        //only organizer can delete
        if (event.organizer_id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only organizers can delete messages'
            });
        }

        if (!event.discussion_forum) {
            return res.status(404).json({
                success: false,
                message: 'No messages in this forum'
            });
        }

        const message = event.discussion_forum.find(msg => msg.message_id.toString() === messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (message.deleted_at) {
            return res.status(400).json({
                success: false,
                message: 'Message already deleted'
            });
        }

        //soft delete
        message.deleted_at = new Date();
        await event.save();

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteMessage:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//pin or unpin msg
export async function togglePinMessage(req, res) {
    try {
        const { id: eventId, messageId } = req.params;
        const userId = req.user.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        //only organizer can pin
        if (event.organizer_id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only organizers can pin messages'
            });
        }

        if (!event.discussion_forum) {
            return res.status(404).json({
                success: false,
                message: 'No messages in this forum'
            });
        }

        const message = event.discussion_forum.find(msg => msg.message_id.toString() === messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (message.deleted_at) {
            return res.status(400).json({
                success: false,
                message: 'Cannot pin a deleted message'
            });
        }

        // Toggle pin status
        message.is_pinned = !message.is_pinned;
        await event.save();

        res.status(200).json({
            success: true,
            message: message.is_pinned ? 'Message pinned' : 'Message unpinned',
            data: {
                is_pinned: message.is_pinned
            }
        });
    } catch (error) {
        console.error('Error in togglePinMessage:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

// POST /api/events/:id/forum/messages/:messageId/react
// React to a message with emoji
export async function reactToMessage(req, res) {
    try {
        const { id: eventId, messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        if (!emoji || emoji.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Emoji is required'
            });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check if user has access
        const isOrganizer = event.organizer_id.toString() === userId;
        const isRegistered = event.registered_participants.some(
            rp => rp.participant && rp.participant.toString() === userId
        );

        if (!isOrganizer && !isRegistered) {
            return res.status(403).json({
                success: false,
                message: 'Only registered participants can react to messages'
            });
        }

        if (!event.discussion_forum) {
            return res.status(404).json({
                success: false,
                message: 'No messages in this forum'
            });
        }

        const message = event.discussion_forum.find(msg => msg.message_id.toString() === messageId.toString());
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (message.deleted_at) {
            return res.status(400).json({
                success: false,
                message: 'Cannot react to a deleted message'
            });
        }

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(
            r => r.user.toString() === userId && r.emoji === emoji
        );

        if (existingReaction) {
            // Remove reaction if already exists (toggle)
            message.reactions = message.reactions.filter(
                r => !(r.user.toString() === userId && r.emoji === emoji)
            );
        } else {
            // Add new reaction
            message.reactions.push({ user: userId, emoji });
        }

        await event.save();

        res.status(200).json({
            success: true,
            message: existingReaction ? 'Reaction removed' : 'Reaction added',
            data: {
                reactions: message.reactions
            }
        });
    } catch (error) {
        console.error('Error in reactToMessage:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}
