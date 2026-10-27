const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const eventSchema = new Schema(
    {
        title: {type: String, required: true, trim: true, maxlength: 120},
        // Stored in UTC. The frontend shows it in Helsinki time.
        startsAt: {type: Date, required: true},
        location: {type: String, default: "", trim: true, maxlength: 200},
        description: {type: String, default: "", trim: true, maxlength: 2000},

        // The film being screened, if there is one. tmdbId is optional so an
        // organiser can name a film without looking it up.
        film: {
            type: new Schema(
                {
                    title: {type: String, required: true, trim: true, maxlength: 200},
                    tmdbId: {type: Number, default: null},
                },
                {_id: false}
            ),
            default: null,
        },

        gifUrl: {type: String, default: null},

        // The "Purchase Tickets" button, for a screening at a theatre. Only
        // moderators and admins set it. An event with one is a theatre
        // screening, where attending members can say where they're sitting.
        ticketUrl: {type: String, default: null},

        createdBy: {type: Schema.Types.ObjectId, ref: "User", required: true},

        // An official club event, or a member screening: one a member is
        // hosting themselves. Moderators can promote and demote between the
        // two. Events from before member screenings have no value and are
        // official (only moderators could make them).
        official: {type: Boolean, default: true},

        // The Attend and Interested buttons. A member is in at most one of
        // the two. Only the event page asks for these; lists leave them out.
        attending: {type: [{type: Schema.Types.ObjectId, ref: "User"}], default: []},
        interested: {type: [{type: Schema.Types.ObjectId, ref: "User"}], default: []},

        // Where attending members are sitting at a theatre screening, one
        // entry each. Like the lists above, only the event page asks.
        seats: {
            type: [
                new Schema(
                    {
                        user: {type: Schema.Types.ObjectId, ref: "User", required: true},
                        row: {type: String, required: true, trim: true, maxlength: 10},
                        seat: {type: String, required: true, trim: true, maxlength: 10},
                    },
                    {_id: false}
                ),
            ],
            default: [],
        },
    },
    {timestamps: true}
);

eventSchema.index({startsAt: 1});

module.exports = mongoose.model("Event", eventSchema);
