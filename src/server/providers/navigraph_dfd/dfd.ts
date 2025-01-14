import * as fs from 'fs';
import initSqlJs, { Database, Statement } from 'sql.js';

import { Coordinates, distanceTo, getDistanceBounds, NauticalMiles } from 'msfs-geo';
import {
    Airport,
    AirportCommunication,
    Airway,
    AirwayLevel,
    Approach,
    Arrival,
    ControlledAirspace,
    DatabaseIdent,
    DataInterface,
    Departure,
    IlsNavaid,
    iso8601CalendarDate,
    Marker,
    NdbClass,
    NdbNavaid,
    ProcedureLeg,
    RestrictiveAirspace,
    Runway,
    VhfNavaid,
    VhfNavaidType,
    VorClass,
    Waypoint,
} from '../../../shared';

// Navigraph types... these must be imported with "Navi" prefix to avoid confusion in the code
import { Header as NaviHeader } from './types/Header';
import { Airport as NaviAirport } from './types/Airports';
import { TerminalProcedure as NaviProcedure } from './types/TerminalProcedures';
import { TerminalWaypoint as NaviTerminalWaypoint } from './types/TerminalWaypoints';
import { EnrouteNDBNavaid as NaviEnrouteNdbNavaid, TerminalNDBNavaid as NaviTerminalNdbNavaid } from './types/NDBNavaids';
import { EnrouteWaypoint as NaviEnrouteWaypoint } from './types/EnrouteWaypoints';
import { EnRouteAirway as NaviAirwayFix } from './types/EnrouteAirways';
import { DFDMappers } from './mappers';
import { ControlledAirspace as NaviControlledAirspace } from './types/ControlledAirspace';
import { RestrictiveAirspace as NaviRestrictiveAirspace } from './types/RestrictiveAirspace';
import { LocalizerGlideslope as NaviIls } from './types/LocalizerGlideslopes';
import { VHFNavaid as NaviVhfNavaid } from './types/VHFNavaids';
import { Holding as NaviHolding } from './types/Holdings';
import { LocalizerMarker as NaviMarker } from './types/LocalizerMarker';
import { Gate } from '../../../shared/types/Gate';
import { Gate as NaviGate } from './types/Gates';

type NaviWaypoint = NaviTerminalWaypoint | NaviEnrouteWaypoint;
type NaviNdbNavaid = NaviTerminalNdbNavaid | NaviEnrouteNdbNavaid;

const query = (stmt: Statement) => {
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
};

export class NavigraphProvider implements DataInterface {
    private database: Database = undefined as any;

    private mappers: DFDMappers = new DFDMappers(this);

    constructor(databasePath: string) {
        const fileBuffer = fs.readFileSync(databasePath);
        initSqlJs().then((SQL) => {
            this.database = new SQL.Database(fileBuffer);
        });
    }

    async getDatabaseIdent(): Promise<DatabaseIdent> {
        const sql = 'SELECT current_airac, effective_fromto, previous_fromto FROM tbl_header';
        const stmt = this.database.prepare(sql);
        try {
            const headers: NaviHeader[] = NavigraphProvider.toCamel(query(stmt));
            const fromTo = headers[0].effectiveFromto;
            const [fromDay, fromMonth, toDay, toMonth, fromYear] = [fromTo, fromTo, fromTo, fromTo, fromTo].map((fromTo, index) => parseInt(fromTo.substring(2 * index, 2 * index + 2)));
            let toYear = fromYear;
            if (fromMonth === 12 && toMonth < 12) {
                toYear++;
            }

            const result: DatabaseIdent = {
                provider: 'Navigraph',
                airacCycle: headers[0].currentAirac,
                effectiveFrom: iso8601CalendarDate(fromYear, fromMonth, fromDay),
                effectiveTo: iso8601CalendarDate(toYear, toMonth, toDay),
            };
            return (result);
        } finally {
            stmt.free();
        }
    }

    // TODO support filtering on area (terminal or enroute)
    async getWaypoints(idents: string[], ppos?: Coordinates, icaoCode?: string, airportIdent?: string): Promise<Waypoint[]> {
        const params = idents.slice();

        const queries = [`
            SELECT area_code, region_code, icao_code, waypoint_identifier, waypoint_name, waypoint_type, NULL as waypoint_usage, waypoint_latitude, waypoint_longitude
            FROM tbl_terminal_waypoints WHERE waypoint_identifier IN (${idents.map(() => '?').join(',')})
        `];

        if (airportIdent === undefined) {
            queries.push(`
                SELECT area_code, NULL as region_code, icao_code, waypoint_identifier, waypoint_name, waypoint_type, waypoint_usage, waypoint_latitude, waypoint_longitude
                FROM tbl_enroute_waypoints WHERE waypoint_identifier IN (${idents.map(() => '?').join(',')})
            `);
        } else {
            queries.forEach((_, i) => {
                queries[i] += ' AND region_code = ?';
            });
            params.push(airportIdent);
        }

        if (icaoCode) {
            queries.forEach((_, i) => {
                queries[i] += ' AND icao_code = ?';
            });
            params.push(icaoCode);
        }

        const sql = queries.join(' UNION ALL ');

        const stmt = this.database.prepare(sql, [].concat(...new Array(queries.length).fill(params)));
        try {
            const rows = query(stmt);
            const navaids: NaviWaypoint[] = NavigraphProvider.toCamel(rows);
            return navaids.map(((navaid) => this.mappers.mapWaypoint(navaid, ppos))).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
        } finally {
            stmt.free();
        }
    }

    // TODO delete (use getNdbNavaids with airportIdentifier set)
    async getNdbsAtAirport(airportIdentifier: string): Promise<NdbNavaid[]> {
        const sql = 'SELECT * FROM tbl_terminal_ndbnavaids WHERE airport_identifier = $ident';
        const stmt = this.database.prepare(sql, { $ident: airportIdentifier });
        const rows = NavigraphProvider.toCamel(query(stmt)) as NaviTerminalNdbNavaid[];
        return rows.map((ndb) => this.mappers.mapNdbNavaid(ndb));
    }

    async getIlsAtAirport(airportIdentifier: string): Promise<IlsNavaid[]> {
        const sql = 'SELECT * FROM tbl_localizers_glideslopes WHERE airport_identifier = $ident';
        const stmt = this.database.prepare(sql, { $ident: airportIdentifier });
        const rows = NavigraphProvider.toCamel(query(stmt)) as NaviIls[];
        return rows.map((ils) => this.mappers.mapIls(ils));
    }

    async getLsMarkers(airportIdentifier: string, runwayIdentifier: string, lsIdentifier: string): Promise<Marker[]> {
        const sql = 'SELECT * FROM tbl_localizer_marker WHERE airport_identifier = $airport AND runway_identifier = $runway AND llz_identifier = $ls';
        const stmt = this.database.prepare(sql, { $airport: airportIdentifier, $runway: runwayIdentifier, $ls: lsIdentifier });
        const rows = NavigraphProvider.toCamel(query(stmt)) as NaviMarker[];
        return rows.map((marker) => this.mappers.mapLsMarker(marker));
    }

    // TODO delete (use getWaypoints with airportIdentifier set)
    async getWaypointsAtAirport(airportIdentifier: string): Promise<Waypoint[]> {
        const sql = 'SELECT * FROM tbl_terminal_waypoints WHERE region_code = $ident';
        const stmt = this.database.prepare(sql, { $ident: airportIdentifier });
        const rows = NavigraphProvider.toCamel(query(stmt)) as NaviTerminalWaypoint[];
        return rows.map((waypoint) => this.mappers.mapWaypoint(waypoint));
    }

    async getAirports(idents: string[]): Promise<Airport[]> {
        const sql = `
            SELECT apt.*, rwy.longest_runway_length
            FROM tbl_airports as apt
            LEFT JOIN (SELECT airport_identifier, MAX(runway_length) as longest_runway_length FROM tbl_runways GROUP BY airport_identifier) as rwy
            ON apt.airport_identifier = rwy.airport_identifier
            WHERE apt.airport_identifier IN (${idents.map(() => '?').join(',')})`;
        const stmt = this.database.prepare(sql, idents);
        try {
            const rows = query(stmt);
            const airports: NaviAirport[] = NavigraphProvider.toCamel(rows);
            return (airports.map(((airport) => this.mappers.mapAirport(airport))));
        } finally {
            stmt.free();
        }
    }

    // TODO support filtering on surface type
    async getRunways(airportIdentifier: string): Promise<Runway[]> {
        const sql = `
            SELECT rwy.*, llz.llz_frequency FROM tbl_runways AS rwy
            LEFT JOIN tbl_localizers_glideslopes AS llz ON rwy.llz_identifier = llz.llz_identifier AND rwy.airport_identifier = llz.airport_identifier
            WHERE rwy.airport_identifier = $ident`;
        const stmt = this.database.prepare(sql, { $ident: airportIdentifier });
        try {
            const rows = NavigraphProvider.toCamel(query(stmt));
            return rows.map((runway) => this.mappers.mapRunway(runway));
        } finally {
            stmt.free();
        }
    }

    // TODO support filtering on longest surface type
    async getNearbyAirports(centre: Coordinates, range: number, limit?: number): Promise<Airport[]> {
        const [sqlWhere, sqlParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range, 'apt.airport_ref_');

        const sql = `
            SELECT apt.*, rwy.longest_runway_length
            FROM tbl_airports as apt
            LEFT JOIN (SELECT airport_identifier, MAX(runway_length) as longest_runway_length FROM tbl_runways GROUP BY airport_identifier) as rwy
            ON apt.airport_identifier = rwy.airport_identifier
            WHERE ${sqlWhere}`;
        const rows = query(this.database.prepare(sql, sqlParams));
        const airports: NaviAirport[] = NavigraphProvider.toCamel(rows);
        return (airports.map((airport) => {
            const ap = this.mappers.mapAirport(airport);
            ap.distance = distanceTo(centre, ap.location);
            return ap;
        }).filter((ap) => (ap.distance ?? 0) <= range)
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)))
            .slice(0, limit);
    }

    async getDepartures(airportIdentifier: string): Promise<Departure[]> {
        const airports = await this.getAirports([airportIdentifier]);
        if (airports.length < 1) {
            return Promise.reject(new Error('Invalid airport'));
        }
        const stmt = this.database.prepare('SELECT * FROM tbl_sids WHERE airport_identifier=$ident', { $ident: airportIdentifier });
        try {
            const rows = query(stmt);
            const departureLegs: NaviProcedure[] = NavigraphProvider.toCamel(rows);
            return (this.mappers.mapDepartures(departureLegs, airports[0]));
        } finally {
            stmt.free();
        }
    }

    async getArrivals(airportIdentifier: string): Promise<Arrival[]> {
        const airports = await this.getAirports([airportIdentifier]);
        if (airports.length < 1) {
            return Promise.reject(new Error('Invalid airport'));
        }
        const stmt = this.database.prepare('SELECT * FROM tbl_stars WHERE airport_identifier=$ident', { $ident: airportIdentifier });
        try {
            const rows = query(stmt);
            const arrivalLegs: NaviProcedure[] = NavigraphProvider.toCamel(rows);
            return (this.mappers.mapArrivals(arrivalLegs, airports[0]));
        } finally {
            stmt.free();
        }
    }

    async getApproaches(airportIdentifier: string): Promise<Approach[]> {
        const airports = await this.getAirports([airportIdentifier]);
        if (airports.length < 1) {
            return Promise.reject(new Error('Invalid airport'));
        }
        const stmt = this.database.prepare('SELECT * FROM tbl_iaps WHERE airport_identifier=$ident', { $ident: airportIdentifier });
        try {
            const rows = query(stmt);
            const approachLegs: NaviProcedure[] = NavigraphProvider.toCamel(rows);
            return (this.mappers.mapApproaches(approachLegs, airports[0]));
        } finally {
            stmt.free();
        }
    }

    async getGates(airportIdentifier: string): Promise<Gate[]> {
        const stmt = this.database.prepare('SELECT * FROM tbl_gate WHERE airport_identifier=$ident', { $ident: airportIdentifier });
        try {
            const rows = query(stmt);
            const gates: NaviGate[] = NavigraphProvider.toCamel(rows);
            return (this.mappers.mapGates(gates));
        } finally {
            stmt.free();
        }
    }

    async getHolds(airportIdentifier: string): Promise<ProcedureLeg[]> {
        const stmt = this.database.prepare('SELECT * FROM tbl_holdings WHERE region_code=$ident', { $ident: airportIdentifier });
        try {
            const rows = query(stmt);
            const holds: NaviHolding[] = NavigraphProvider.toCamel(rows);
            return (this.mappers.mapHolds(holds));
        } finally {
            stmt.free();
        }
    }

    // TODO support filtering on level
    async getAirways(idents: string[]): Promise<Airway[]> {
        const stmt = this.database.prepare(`SELECT * FROM tbl_enroute_airways WHERE route_identifier IN (${idents.map(() => '?').join(',')})`, idents);
        try {
            const rows = query(stmt);
            const airways: NaviAirwayFix[] = NavigraphProvider.toCamel(rows);
            return (this.mappers.mapAirways(airways));
        } finally {
            stmt.free();
        }
    }

    async getAirwaysByFix(ident: string, icaoCode: string): Promise<Airway[]> {
        const stmt = this.database.prepare(
            'SELECT * FROM tbl_enroute_airways WHERE route_identifier IN (SELECT route_identifier FROM tbl_enroute_airways WHERE waypoint_identifier = $ident AND icao_code = $icao)',
            { $ident: ident, $icao: icaoCode },
        );
        try {
            const rows = query(stmt);
            const airways: NaviAirwayFix[] = NavigraphProvider.toCamel(rows);
            return (this.mappers.mapAirways(airways).filter((airway) => airway.fixes.find((fix) => fix.ident === ident)));
        } finally {
            stmt.free();
        }
    }

    // TODO support filtering on type and class
    async getVhfNavaids(idents: string[], ppos?: Coordinates, icaoCode?: string, airportIdent?: string): Promise<VhfNavaid[]> {
        let sql = `SELECT * FROM tbl_vhfnavaids WHERE vor_identifier IN (${idents.map(() => '?').join(',')})`; // TODO vor_identifier vs. dme_identifier...?
        const params = idents.slice();
        if (icaoCode) {
            sql += ' AND icao_code = ?';
            params.push(icaoCode);
        }
        if (airportIdent) {
            sql += ' AND airport_identifier = ?';
            params.push(airportIdent);
        }
        const stmt = this.database.prepare(sql, params);
        try {
            const rows = query(stmt);
            const navaids: NaviVhfNavaid[] = NavigraphProvider.toCamel(rows);
            return navaids.map(((navaid) => this.mappers.mapVhfNavaid(navaid, ppos))).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
        } finally {
            stmt.free();
        }
    }

    // TODO support filtering on class
    async getNdbNavaids(idents: string[], ppos?: Coordinates, icaoCode?: string, airportIdent?: string): Promise<NdbNavaid[]> {
        const results: NdbNavaid[] = [];
        if (!airportIdent) {
            let sql = `SELECT * FROM tbl_enroute_ndbnavaids WHERE ndb_identifier IN (${idents.map(() => '?').join(',')})`;
            const params = idents.slice();
            if (icaoCode) {
                sql += ' AND icao_code = ?';
                params.push(icaoCode);
            }
            const stmt = this.database.prepare(sql, params);
            try {
                const rows = query(stmt);
                const navaids: NaviNdbNavaid[] = NavigraphProvider.toCamel(rows);
                results.push(...navaids.map(((navaid) => this.mappers.mapNdbNavaid(navaid, ppos))));
            } finally {
                stmt.free();
            }
        }
        let sql = `SELECT * FROM tbl_terminal_ndbnavaids WHERE ndb_identifier IN (${idents.map(() => '?').join(',')})`;
        const params = idents.slice();
        if (airportIdent) {
            sql += ' AND airport_identifier = ?';
            params.push(airportIdent);
        } else if (icaoCode) {
            sql += ' AND icao_code = ?';
            params.push(icaoCode);
        }
        const stmt = this.database.prepare(sql, params);
        try {
            const rows = query(stmt);
            const navaids: NaviNdbNavaid[] = NavigraphProvider.toCamel(rows);
            results.push(...navaids.map(((navaid) => this.mappers.mapNdbNavaid(navaid))));
        } finally {
            stmt.free();
        }

        return results.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }

    async getNearbyAirways(centre: Coordinates, range: NauticalMiles, limit?: number, levels?: AirwayLevel): Promise<Airway[]> {
        const [sqlWhere, sqlParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range, 'waypoint_');
        // TODO: This currently loads all Airways with a route_identifier which is the same as an in range airway.
        // Queries significantly more airways than it should, the distanceTo fixes it but bad performance
        const rows = query(this.database.prepare(
            `SELECT * FROM tbl_enroute_airways WHERE route_identifier IN (SELECT route_identifier FROM tbl_enroute_airways WHERE ${sqlWhere})`,
            sqlParams,
        ));
        const airways = this.mappers.mapAirways(NavigraphProvider.toCamel(rows)).filter((airway) => airway.fixes.find((fix) => distanceTo(fix.location, centre) < range));
        if (levels === undefined) {
            return airways;
        }
        return airways.filter((airway) => (airway.level & levels) === airway.level).slice(0, limit);
    }

    async getNearbyNdbNavaids(centre: Coordinates, range: number, limit?: number, classes?: NdbClass): Promise<NdbNavaid[]> {
        const [sqlWhere, sqlParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range, 'ndb_');

        const sql = `SELECT area_code, airport_identifier, icao_code, ndb_identifier, ndb_name, ndb_frequency, navaid_class, ndb_latitude, ndb_longitude
            FROM tbl_terminal_ndbnavaids WHERE ${sqlWhere}
            UNION ALL
            SELECT area_code, NULL, icao_code, ndb_identifier, ndb_name, ndb_frequency, navaid_class, ndb_latitude, ndb_longitude FROM tbl_enroute_ndbnavaids WHERE ${sqlWhere}
        `;

        const rows = query(this.database.prepare(sql, sqlParams.concat(sqlParams)));
        if (rows.length < 1) {
            return [];
        }
        const navaids: NaviNdbNavaid[] = NavigraphProvider.toCamel(rows);
        return navaids.map((navaid) => {
            const na = this.mappers.mapNdbNavaid(navaid);
            na.distance = distanceTo(centre, na.location);
            return na;
        }).filter((na) => (na.distance ?? 0) <= range && (classes === undefined || (na.class & classes) > 0))
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
            .slice(0, limit);
    }

    async getNearbyVhfNavaids(centre: Coordinates, range: number, limit?: number, classes?: VorClass, types?: VhfNavaidType): Promise<VhfNavaid[]> {
        const [vorWhere, vorParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range, 'vor_');
        const [dmeWhere, dmeParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range, 'dme_');

        const sql = `SELECT * FROM tbl_vhfnavaids WHERE (${vorWhere}) OR (${dmeWhere})`;
        const rows = query(this.database.prepare(sql, vorParams.concat(dmeParams)));
        if (rows.length < 1) {
            return [];
        }
        const navaids: NaviVhfNavaid[] = NavigraphProvider.toCamel(rows);
        return navaids.map((navaid) => {
            const na = this.mappers.mapVhfNavaid(navaid);
            const loc = na.location ?? na.dmeLocation;
            na.distance = distanceTo(centre, { lat: (loc?.lat ?? centre.lat), long: (loc?.long ?? centre.long) });
            return na;
        }).filter((na) => (na.distance ?? 0) <= range
                && (types === undefined || (na.type & types) > 0)
                && (classes === undefined || (na.class & classes) > 0))
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
            .slice(0, limit);
    }

    async getNearbyWaypoints(centre: Coordinates, range: number, limit?: number): Promise<Waypoint[]> {
        const [sqlWhere, sqlParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range, 'waypoint_');

        const sql = `
            SELECT area_code, NULL as region_code, icao_code, waypoint_identifier, waypoint_name, waypoint_type, waypoint_usage, waypoint_latitude, waypoint_longitude
            FROM tbl_enroute_waypoints WHERE ${sqlWhere}
            UNION ALL
            SELECT area_code, region_code, icao_code, waypoint_identifier, waypoint_name, waypoint_type, NULL as waypoint_usage, waypoint_latitude, waypoint_longitude
            FROM tbl_terminal_waypoints WHERE ${sqlWhere}
        `;

        const rows = query(this.database.prepare(sql, sqlParams.concat(sqlParams)));
        if (rows.length < 1) {
            return [];
        }
        const navaids: NaviWaypoint[] = NavigraphProvider.toCamel(rows);
        return navaids.map((navaid) => {
            const na = this.mappers.mapWaypoint(navaid);
            na.distance = distanceTo(centre, na.location);
            return na;
        }).filter((ap) => (ap.distance ?? 0) <= range)
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
            .slice(0, limit);
    }

    async getControlledAirspaceInRange(centre: Coordinates, range: NauticalMiles): Promise<ControlledAirspace[]> {
        const [llWhere, llParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range);
        const [arcWhere, arcParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range, 'arc_origin_');

        const subQuery = `SELECT airspace_center, multiple_code FROM tbl_controlled_airspace WHERE ${llWhere} OR ${arcWhere}`;
        const sql = `SELECT * FROM tbl_controlled_airspace WHERE (airspace_center, multiple_code) IN (${subQuery})`;

        const rows = query(this.database.prepare(sql, [...llParams, ...arcParams]));
        const airspaces: NaviControlledAirspace[] = NavigraphProvider.toCamel(rows);
        return this.mappers.mapControlledAirspaceBoundaries(airspaces);
    }

    async getRestrictiveAirspaceInRange(centre: Coordinates, range: NauticalMiles): Promise<RestrictiveAirspace[]> {
        const [llWhere, llParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range);
        const [arcWhere, arcParams] = NavigraphProvider.nearbyBoundingBoxQuery(centre, range, 'arc_origin_');

        const subQuery = `SELECT restrictive_airspace_designation, icao_code FROM tbl_restrictive_airspace WHERE ${llWhere} OR ${arcWhere}`;
        const sql = `SELECT * FROM tbl_restrictive_airspace WHERE (restrictive_airspace_designation, icao_code) IN (${subQuery})`;

        const rows = query(this.database.prepare(sql, [...llParams, ...arcParams]));
        const airspaces: NaviRestrictiveAirspace[] = NavigraphProvider.toCamel(rows);
        return this.mappers.mapRestrictiveAirspaceBoundaries(airspaces);
    }

    public static toCamel(query: any[]) {
        return query.map((obj) => {
            const newObj: any = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    let segments = key.split('_');
                    segments = segments.map((seg, i) => {
                        if (i) return this.capitalizeFirstLetter(seg);
                        return seg;
                    });
                    const newKey = segments.join('');
                    newObj[newKey] = obj[key];
                }
            }
            return newObj;
        });
    }

    public static capitalizeFirstLetter(text: string): string {
        return text.charAt(0).toUpperCase() + text.substring(1);
    }

    private static nearbyBoundingBoxQuery(centre: Coordinates, range: number, prefix: string = ''): [string, number[]] {
        const [southWestCorner, northEastCorner] = getDistanceBounds(centre, range);

        const longitudeCrosses = southWestCorner.long > northEastCorner.long;

        let sql: string;
        let params: any[];

        if (longitudeCrosses) {
            sql = `${prefix}latitude >= ? AND ${prefix}latitude <= ? AND (${prefix}longitude >= ? OR ${prefix}longitude <= ?)`;
            params = [southWestCorner.lat, northEastCorner.lat, southWestCorner.long, northEastCorner.long];
        } else if (Math.max(southWestCorner.lat, northEastCorner.lat) > 80) {
            // getting too close to or crossing the north pole... we need to just take all items above the lowest latitude and filter them ourselves later
            sql = `${prefix}latitude >= ?`;
            params = [Math.min(southWestCorner.lat, northEastCorner.lat)];
        } else if (Math.min(southWestCorner.lat, northEastCorner.lat) < -80) {
            // getting too close to or crossing the south pole... we need to just take all items below the lowest latitude and filter them ourselves later
            sql = `${prefix}latitude <= ?`;
            params = [Math.max(southWestCorner.lat, northEastCorner.lat)];
        } else {
            sql = `${prefix}latitude >= ? AND ${prefix}latitude <= ? AND ${prefix}longitude >= ? AND ${prefix}longitude <= ?`;
            params = [southWestCorner.lat, northEastCorner.lat, southWestCorner.long, northEastCorner.long];
        }

        return [sql, params];
    }

    async getCommunicationsAtAirport(airportIdentifier: string): Promise<AirportCommunication[]> {
        const stmt = this.database.prepare('SELECT * FROM tbl_airport_communication WHERE tbl_airport_communication.airport_identifier = $ident', { $ident: airportIdentifier });
        try {
            const rows = NavigraphProvider.toCamel(query(stmt));
            return rows.map((communication) => this.mappers.mapAirportCommunication(communication));
        } finally {
            stmt.free();
        }
    }
}
