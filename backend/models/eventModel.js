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
        createdBy: {type: Schema.Types.ObjectId, ref: "User", required: true},
    },
    {timestamps: true}
);

eventSchema.index({startsAt: 1});

module.exports = mongoose.model("Event", eventSchema);
