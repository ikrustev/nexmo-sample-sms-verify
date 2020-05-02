function createInstance() {

    const byId = {};
    const byNumber = {};
    let lastId = 0;

    function getById(id) {
        return byId[id];
    }

    function getByNumber(e164) {
        return byNumber[e164];
    }

    function create(passenger, driver, proxy) {
        let existing;
        existing = getByNumber(passenger);
        if (existing) {
            throw "Passenger already on ride id: " + existing.id;
        }
        existing = getByNumber(driver);
        if (existing) {
            throw "Driver already on ride id: " + existing.id;
        }
        const ride = {
            kind: "ride",
            id: ++lastId,
            passenger: passenger,
            driver: driver,
            proxy: proxy
        };
        byId[ride.id] = ride;
        byNumber[ride.passenger] = ride;
        byNumber[ride.driver] = ride;
        return ride;
    }

    function remove(id) {
        const ride = byId[id];
        if (ride) {
            delete byId[id];
            delete byNumber[ride.passenger];
            delete byNumber[ride.driver];
        }
    }

    function getParty(ride, number) {
        if (ride.passenger === number) {
            return ride.driver;
        }
        if (ride.driver === number) {
            return ride.passenger;
        }
        return null;
    }

    return {
        getById: getById,
        getByNumber: getByNumber,
        create: create,
        remove: remove,
        getParty: getParty
    };
}

exports.create = createInstance;
